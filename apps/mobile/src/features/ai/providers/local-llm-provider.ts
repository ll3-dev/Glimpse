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
  buildSummaryPrompt,
  buildTagsPrompt,
  parseTagsResponse,
} from './metadata-text';
import {
  getSelectedLocalModel,
  isLocalLLMReady,
} from '@/src/features/settings/local-llm.selectors';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';
import {
  type LlamaService,
} from '../llama-service';
import { createLocalLLMRuntime } from '../local-llm';

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
  const runtime = createLocalLLMRuntime(config.llamaService);

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
        // Generate summary
        const summaryPrompt = runtime.buildMetadataPrompt(model, 'summary', input);
        const summaryResult = await runtime.generate(model, summaryPrompt, {
          maxTokens: 128,
        });

        // Generate tags
        const tagsPrompt = runtime.buildMetadataPrompt(model, 'tags', input);
        const tagsResult = await runtime.generate(model, tagsPrompt, {
          maxTokens: 64,
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
