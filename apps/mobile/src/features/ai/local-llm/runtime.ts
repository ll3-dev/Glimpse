import {
  createLlamaService,
  type GenerateOptions,
  type GenerateResult,
  type LlamaPromptInput,
  type LlamaService,
  type StreamOptions,
} from '../llama-service';
import { buildSummaryPrompt, buildTagsPrompt } from '../providers/metadata-text';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';
import type { KnowledgeItem } from '@glimpse/shared';
import { resolveLocalLLMPreset } from './presets';
import type { LocalLLMMessage } from './types';

export interface LocalLLMRuntime {
  ensureModelLoaded: (model: LocalModel) => Promise<void>;
  buildChatPrompt: (
    model: LocalModel,
    messages: LocalLLMMessage[],
    contextItems?: KnowledgeItem[] | null
  ) => LlamaPromptInput;
  buildMetadataPrompt: (
    model: LocalModel,
    task: 'summary' | 'tags',
    instructionInput: Parameters<typeof buildSummaryPrompt>[0]
  ) => LlamaPromptInput;
  generate: (
    model: LocalModel,
    prompt: LlamaPromptInput,
    options?: GenerateOptions
  ) => Promise<GenerateResult>;
  generateStream: (
    model: LocalModel,
    prompt: LlamaPromptInput,
    options?: StreamOptions
  ) => Promise<GenerateResult>;
  stopGeneration: () => Promise<void>;
  unloadModel: () => Promise<void>;
  isModelLoaded: () => boolean;
}

export function createLocalLLMRuntime(service: LlamaService = createLlamaService()): LocalLLMRuntime {
  let loadedModelId: string | null = null;
  let loadingModelId: string | null = null;
  let loadingPromise: Promise<void> | null = null;

  async function ensureModelLoaded(model: LocalModel): Promise<void> {
    if (!model.path) {
      throw new Error('Selected model has no path configured');
    }

    if (loadedModelId === model.id && service.isModelLoaded()) {
      return;
    }

    if (loadingPromise && loadingModelId === model.id) {
      await loadingPromise;
      return;
    }

    if (service.isModelLoaded()) {
      await service.unloadModel();
    }

    const preset = resolveLocalLLMPreset(model);
    loadingModelId = model.id;
    loadingPromise = service
      .loadModel(model.path, preset.loadOptions)
      .then(() => {
        loadedModelId = model.id;
      })
      .finally(() => {
        loadingModelId = null;
        loadingPromise = null;
      });

    await loadingPromise;
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

    buildChatPrompt(model, messages, contextItems) {
      return resolveLocalLLMPreset(model).buildChatPrompt(messages, contextItems);
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
      const preset = resolveLocalLLMPreset(model);
      const resolvedOptions = resolveOptions(model, options);
      let rawStreamText = '';
      let emittedText = '';

      const result = await service.generateStream(prompt, {
        ...resolvedOptions,
        onToken: options?.onToken
          ? (token) => {
              rawStreamText += token;
              const nextText = preset.sanitizeOutput(rawStreamText);

              if (nextText.startsWith(emittedText)) {
                const delta = nextText.slice(emittedText.length);
                if (delta) {
                  emittedText = nextText;
                  options.onToken?.(delta);
                }
              }
            }
          : undefined,
      });
      return sanitizeResult(model, result);
    },

    async stopGeneration() {
      await service.stopGeneration();
    },

    async unloadModel() {
      if (loadingPromise) {
        await loadingPromise.catch(() => undefined);
      }
      await service.stopGeneration();
      await service.unloadModel();
      loadedModelId = null;
    },

    isModelLoaded() {
      return service.isModelLoaded();
    },
  };
}
