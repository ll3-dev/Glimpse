/**
 * Local LLM Metadata Provider
 *
 * Uses on-device LLM for metadata generation.
 * Requires a downloaded model and enabled configuration.
 */

import type { Result } from '@/src/lib/effect-result';
import type { MetadataProvider, MetadataInput, MetadataOutput } from '../metadata/types';
import { aiProviderError } from '../metadata/types';
import {
  getSelectedLocalModel,
  isLocalLLMReady,
} from '@/src/features/settings/local-llm.selectors';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';
import {
  createLlamaService,
  type LlamaService,
  type GenerateOptions,
} from '../llama-service';

/**
 * Local LLM provider configuration
 */
export interface LocalLLMProviderConfig {
  /** Check if Local LLM is ready (defaults to isLocalLLMReady selector) */
  isReady?: () => boolean;
  /** Get selected model (defaults to getSelectedLocalModel selector) */
  getSelectedModel?: () => LocalModel | null;
  /** Llama service instance (defaults to new createLlamaService()) */
  llamaService?: LlamaService;
}

/**
 * Default generation options for metadata
 */
const DEFAULT_GENERATE_OPTIONS: GenerateOptions = {
  maxTokens: 256,
  temperature: 0.3,
  topP: 0.9,
};

/**
 * Build a prompt for summary generation
 */
function buildSummaryPrompt(input: MetadataInput): string {
  const content = input.title
    ? `Title: ${input.title}\n\nContent: ${input.content}`
    : input.content;

  return `Summarize the following content in 1-2 concise sentences. Only output the summary, nothing else.

${content}`;
}

/**
 * Build a prompt for tag generation
 */
function buildTagsPrompt(input: MetadataInput): string {
  const content = input.title
    ? `Title: ${input.title}\n\nContent: ${input.content}`
    : input.content;

  return `Extract 3-5 relevant tags from the following content. Output only the tags as a comma-separated list, nothing else.

${content}`;
}

/**
 * Parse tags from LLM response
 */
function parseTagsResponse(response: string): string[] {
  // Handle comma-separated or newline-separated tags
  const tags = response
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.length < 50)
    .map((tag) => {
      // Remove quotes and hash symbols
      return tag.replace(/^["'#]+|["'#]+$/g, '').trim();
    })
    .filter((tag) => tag.length > 0);

  // Return unique tags, max 5
  return [...new Set(tags)].slice(0, 5);
}

/**
 * Create a Local LLM metadata provider.
 *
 * Availability requirements:
 * - Local LLM is enabled
 * - A model is selected
 * - Selected model is ready (downloaded)
 */
export function createLocalLLMProvider(config: LocalLLMProviderConfig = {}): MetadataProvider {
  const checkIsReady = config.isReady ?? isLocalLLMReady;
  const getSelected = config.getSelectedModel ?? getSelectedLocalModel;
  const service = config.llamaService ?? createLlamaService();

  // Track currently loaded model
  let loadedModelId: string | null = null;

  return {
    name: 'local',

    async isAvailable(): Promise<boolean> {
      return checkIsReady();
    },

    async generate(input: MetadataInput): Promise<Result<MetadataOutput>> {
      // Check availability
      if (!checkIsReady()) {
        return {
          success: false,
          error: aiProviderError(
            'AI_PROVIDER_UNAVAILABLE',
            'local',
            'Local LLM is not available or no model is selected'
          ),
        };
      }

      const model = getSelected();
      if (!model) {
        return {
          success: false,
          error: aiProviderError(
            'AI_PROVIDER_UNAVAILABLE',
            'local',
            'No model selected'
          ),
        };
      }

      // Check model path
      if (!model.path) {
        return {
          success: false,
          error: aiProviderError(
            'AI_PROVIDER_UNAVAILABLE',
            'local',
            'Selected model has no path configured',
            { modelId: model.id }
          ),
        };
      }

      try {
        // Load model if not already loaded or if different model
        if (loadedModelId !== model.id) {
          // Unload previous model if any
          if (service.isModelLoaded()) {
            await service.unloadModel();
          }

          // Load new model
          await service.loadModel(model.path, {
            contextSize: 2048,
            gpuLayers: 0, // CPU by default, can be configured later
          });

          loadedModelId = model.id;
        }

        // Generate summary
        const summaryPrompt = buildSummaryPrompt(input);
        const summaryResult = await service.generate(summaryPrompt, {
          ...DEFAULT_GENERATE_OPTIONS,
          maxTokens: 128, // Shorter for summary
        });

        // Generate tags
        const tagsPrompt = buildTagsPrompt(input);
        const tagsResult = await service.generate(tagsPrompt, {
          ...DEFAULT_GENERATE_OPTIONS,
          maxTokens: 64, // Shorter for tags
        });

        // Parse tags from response
        const tags = parseTagsResponse(tagsResult.text);

        return {
          success: true,
          data: {
            summary: summaryResult.text.trim(),
            tags,
          },
        };
      } catch (error) {
        // Map to provider error
        return {
          success: false,
          error: aiProviderError(
            'AI_PROVIDER_INTERNAL_ERROR',
            'local',
            error instanceof Error ? error.message : 'Local LLM generation failed',
            { modelId: model.id, cause: error }
          ),
        };
      }
    },
  };
}

/**
 * Default Local LLM provider instance
 *
 * Uses default selectors for availability checking.
 */
export const localLLMProvider = createLocalLLMProvider();

// Export helper functions for testing
export { buildSummaryPrompt, buildTagsPrompt, parseTagsResponse };
