import { createLlamaService, type GenerateOptions, type GenerateResult, type LlamaService, type StreamOptions } from '../llama-service';
import { buildSummaryPrompt, buildTagsPrompt } from '../providers/metadata-text';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';
import type { KnowledgeItem } from '@/src/db';
import { resolveLocalLLMPreset } from './presets';
import type { LocalLLMMessage } from './types';

export interface LocalLLMRuntime {
  ensureModelLoaded: (model: LocalModel) => Promise<void>;
  buildChatPrompt: (
    model: LocalModel,
    messages: LocalLLMMessage[],
    contextItem?: KnowledgeItem | null
  ) => string;
  buildMetadataPrompt: (
    model: LocalModel,
    task: 'summary' | 'tags',
    instructionInput: Parameters<typeof buildSummaryPrompt>[0]
  ) => string;
  generate: (
    model: LocalModel,
    prompt: string,
    options?: GenerateOptions
  ) => Promise<GenerateResult>;
  generateStream: (
    model: LocalModel,
    prompt: string,
    options?: StreamOptions
  ) => Promise<GenerateResult>;
  stopGeneration: () => Promise<void>;
}

export function createLocalLLMRuntime(service: LlamaService = createLlamaService()): LocalLLMRuntime {
  let loadedModelId: string | null = null;

  async function ensureModelLoaded(model: LocalModel): Promise<void> {
    if (!model.path) {
      throw new Error('Selected model has no path configured');
    }

    if (loadedModelId === model.id && service.isModelLoaded()) {
      return;
    }

    if (service.isModelLoaded()) {
      await service.unloadModel();
    }

    await service.loadModel(model.path, {
      contextSize: 4096,
      gpuLayers: 0,
    });
    loadedModelId = model.id;
  }

  function resolveOptions(model: LocalModel, options?: GenerateOptions | StreamOptions) {
    const preset = resolveLocalLLMPreset(model);

    return {
      ...preset.defaults,
      ...options,
      stopTokens: options?.stopTokens ?? preset.stopTokens,
    };
  }

  function sanitizeResult(model: LocalModel, result: GenerateResult): GenerateResult {
    const preset = resolveLocalLLMPreset(model);

    return {
      ...result,
      text: preset.sanitizeOutput(result.text),
    };
  }

  return {
    ensureModelLoaded,

    buildChatPrompt(model, messages, contextItem) {
      return resolveLocalLLMPreset(model).buildChatPrompt(messages, contextItem);
    },

    buildMetadataPrompt(model, task, input) {
      const instruction = task === 'summary' ? buildSummaryPrompt(input) : buildTagsPrompt(input);
      return resolveLocalLLMPreset(model).buildInstructionPrompt(task, instruction);
    },

    async generate(model, prompt, options) {
      await ensureModelLoaded(model);
      const result = await service.generate(prompt, resolveOptions(model, options));
      return sanitizeResult(model, result);
    },

    async generateStream(model, prompt, options) {
      await ensureModelLoaded(model);
      const result = await service.generateStream(prompt, resolveOptions(model, options));
      return sanitizeResult(model, result);
    },

    async stopGeneration() {
      await service.stopGeneration();
    },
  };
}
