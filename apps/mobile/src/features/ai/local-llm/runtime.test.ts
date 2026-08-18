import { describe, expect, mock, test } from 'bun:test';
import type { LlamaService } from '../llama-service';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';
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
    family: 'qwen-chatml',
    path: 'file:///tmp/model.gguf',
    isReady: true,
    ...overrides,
  };
}

describe('resolveLocalLLMPreset', () => {
  test('applies model-specific overrides on top of family defaults', () => {
    const preset = resolveLocalLLMPreset(createModel());

    expect(preset.family).toBe('qwen-chatml');
    expect(preset.defaults.maxTokens).toBe(384);
    expect(preset.defaults.temperature).toBe(0.2);
    expect(preset.stopTokens).toEqual(['<|im_end|>', '<|endoftext|>', '</s>']);
  });
});

describe('createLocalLLMRuntime', () => {
  test('builds qwen prompts with ChatML markers', () => {
    const runtime = createLocalLLMRuntime(createMockService());
    const prompt = runtime.buildChatPrompt(createModel(), [{ role: 'user', content: '안녕' }]);

    expect(prompt).toContain('<|im_start|>system');
    expect(prompt).toContain('<|im_start|>user\n안녕\n<|im_end|>');
    expect(prompt).toContain('<|im_start|>assistant');
  });

  test('builds multi-turn qwen prompts with distinct turn boundaries', () => {
    const runtime = createLocalLLMRuntime(createMockService());
    const prompt = runtime.buildChatPrompt(createModel(), [
      { role: 'user', content: '첫 번째 질문' },
      { role: 'assistant', content: '첫 번째 답변' },
      { role: 'user', content: '두 번째 질문' },
    ]);

    expect(prompt).toContain('<|im_start|>user\n첫 번째 질문\n<|im_end|>');
    expect(prompt).toContain('<|im_start|>assistant\n첫 번째 답변\n<|im_end|>');
    expect(prompt).toContain('<|im_start|>user\n두 번째 질문\n<|im_end|>');
    expect(prompt.endsWith('<|im_start|>assistant\n')).toBe(true);
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
      stopTokens: ['<|im_end|>', '<|endoftext|>', '</s>'],
    });
  });

  test('sanitizes streamed output before returning', async () => {
    const runtime = createLocalLLMRuntime(createMockService());
    const result = await runtime.generateStream(createModel(), 'prompt');

    expect(result.text).toBe('답변');
  });
});
