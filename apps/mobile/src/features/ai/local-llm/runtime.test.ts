import { describe, expect, mock, test } from 'bun:test';
import type { LlamaService } from '../llama-service';
import type { LocalModel } from '@/src/features/core/application/state';
import { resolveLocalLLMPreset } from './presets';
import { createLocalLLMRuntime } from './runtime';

function createMockService(): LlamaService {
  return {
    loadModel: mock(async () => {}),
    isModelLoaded: mock(() => false),
    generate: mock(async () => ({
      text: '요약 결과<|im_end|>',
      tokensGenerated: 10,
      timingMs: 1,
    })),
    generateStream: mock(async () => ({
      text: '답변<|im_start|>user',
      tokensGenerated: 10,
      timingMs: 1,
    })),
    stopGeneration: mock(async () => {}),
    unloadModel: mock(async () => {}),
  };
}

function createModel(overrides: Partial<LocalModel> = {}): LocalModel {
  return {
    id: 'qwen3.5-4b-q4',
    name: 'Qwen',
    family: 'embedded-chat',
    size: 1_000_000_000,
    downloaded: true,
    path: 'file:///tmp/model.gguf',
    isReady: true,
    ...overrides,
  };
}

describe('resolveLocalLLMPreset', () => {
  test('applies model-specific overrides on top of family defaults', () => {
    const preset = resolveLocalLLMPreset(createModel());

    expect(preset.family).toBe('embedded-chat');
    expect(preset.defaults.maxTokens).toBe(384);
    expect(preset.defaults.temperature).toBe(0.2);
    expect(preset.stopTokens).toContain('<|im_end|>');
  });

  test('uses Metal-first loading for non-Qwen mobile models', () => {
    const preset = resolveLocalLLMPreset(
      createModel({ id: 'ministral-3-3b-instruct-q4', family: 'mistral' })
    );

    expect(preset.loadOptions).toMatchObject({
      gpuLayers: -1,
      flashAttention: true,
      useMmap: true,
    });
  });

  test('uses the LFM mobile template and hides its reasoning block', () => {
    const model = createModel({
      id: 'lfm2.5-2.6b-q4',
      family: 'lfm2',
    });
    const preset = resolveLocalLLMPreset(model);
    const prompt = preset.buildChatPrompt([{ role: 'user', content: '정리해줘' }]);

    expect(prompt).toStartWith('<|startoftext|><|im_start|>system');
    expect(prompt).toContain('<|im_start|>user\n정리해줘<|im_end|>');
    expect(prompt).toEndWith('<|im_start|>assistant\n<think>\n');
    expect(preset.sanitizeOutput('<think>검토 중</think>\n최종 답변<|im_end|>')).toBe('최종 답변');
  });
});

describe('createLocalLLMRuntime', () => {
  test('passes messages to the GGUF embedded chat template', () => {
    const runtime = createLocalLLMRuntime(createMockService());
    const prompt = runtime.buildChatPrompt(createModel(), [{ role: 'user', content: '안녕' }]);

    expect(prompt).toMatchObject({
      enableThinking: false,
      messages: [
        { role: 'system' },
        { role: 'user', content: '안녕' },
      ],
    });
  });

  test('preserves multi-turn roles for the embedded chat template', () => {
    const runtime = createLocalLLMRuntime(createMockService());
    const prompt = runtime.buildChatPrompt(createModel(), [
      { role: 'user', content: '첫 번째 질문' },
      { role: 'assistant', content: '첫 번째 답변' },
      { role: 'user', content: '두 번째 질문' },
    ]);

    expect(prompt).toMatchObject({
      messages: [
        { role: 'system' },
        { role: 'user', content: '첫 번째 질문' },
        { role: 'assistant', content: '첫 번째 답변' },
        { role: 'user', content: '두 번째 질문' },
      ],
    });
  });

  test('merges preset defaults into generation options', async () => {
    const service = createMockService();
    const runtime = createLocalLLMRuntime(service);
    const model = createModel();

    await runtime.generate(model, 'prompt');

    expect(service.loadModel).toHaveBeenCalledWith(model.path, {
      contextSize: 4096,
      gpuLayers: -1,
      useMlock: false,
      useMmap: true,
      flashAttention: true,
    });
    const generateCall = (service.generate as ReturnType<typeof mock>).mock.calls[0];
    expect(generateCall?.[1]).toMatchObject({
      maxTokens: 384,
      temperature: 0.2,
      topP: 0.85,
      stopTokens: expect.arrayContaining(['<|im_end|>', '</s>']),
    });
  });

  test('sanitizes streamed output before returning', async () => {
    const runtime = createLocalLLMRuntime(createMockService());
    const result = await runtime.generateStream(createModel(), 'prompt');

    expect(result.text).toBe('답변');
  });

  test('does not emit LFM reasoning tokens to the chat stream', async () => {
    const service = createMockService();
    service.generateStream = mock(async (_prompt, options) => {
      options?.onToken?.('<think>검토');
      options?.onToken?.(' 중</think>답');
      options?.onToken?.('변');
      return {
        text: '<think>검토 중</think>답변',
        tokensGenerated: 4,
        timingMs: 1,
      };
    });
    const onToken = mock((_token: string) => {});
    const runtime = createLocalLLMRuntime(service);
    const model = createModel({ id: 'lfm2.5-2.6b-q4', family: 'lfm2' });

    const result = await runtime.generateStream(model, 'prompt', { onToken });

    expect(onToken).toHaveBeenCalledTimes(2);
    expect(onToken.mock.calls.map((call) => call[0]).join('')).toBe('답변');
    expect(result.text).toBe('답변');
  });

  test('stops generation and releases the model under memory pressure', async () => {
    const service = createMockService();
    const runtime = createLocalLLMRuntime(service);

    await runtime.ensureModelLoaded(createModel());
    await runtime.unloadModel();

    expect(service.stopGeneration).toHaveBeenCalledTimes(1);
    expect(service.unloadModel).toHaveBeenCalledTimes(1);
    expect(runtime.isModelLoaded()).toBe(false);
  });
});
