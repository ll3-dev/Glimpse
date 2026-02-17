/**
 * Local LLM Metadata Provider
 *
 * Uses on-device LLM for metadata generation.
 * Requires a downloaded model and enabled configuration.
 *
 * TODO: Integrate with react-native-llm or @react-native-ai/local
 */

import type { Result } from '@/src/lib/effect-result';
import type { MetadataProvider, MetadataInput, MetadataOutput } from '../metadata/types';
import { aiProviderError } from '../metadata/types';
import {
  getSelectedLocalModel,
  isLocalLLMReady,
} from '@/src/features/settings/local-llm.selectors';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';

/**
 * Local LLM provider configuration
 */
export interface LocalLLMProviderConfig {
  /** Check if Local LLM is ready (defaults to isLocalLLMReady selector) */
  isReady?: () => boolean;
  /** Get selected model (defaults to getSelectedLocalModel selector) */
  getSelectedModel?: () => LocalModel | null;
}

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

      try {
        // TODO: Integrate with react-native-llm
        // Example integration pattern:
        //
        // const { GoogleLLM } = require('react-native-llm');
        //
        // const summaryResponse = await GoogleLLM.generate({
        //   prompt: buildSummaryPrompt(input),
        //   modelPath: model.path,
        // });
        //
        // const tagsResponse = await GoogleLLM.generate({
        //   prompt: buildTagsPrompt(input),
        //   modelPath: model.path,
        // });

        // For now, return unavailable to trigger fallback
        // Once native module is integrated, replace with actual implementation
        return {
          success: false,
          error: aiProviderError(
            'AI_PROVIDER_UNAVAILABLE',
            'local',
            'Local LLM SDK integration pending. Falling back to next provider.',
            {
              modelId: model.id,
              modelName: model.name,
              pendingIntegration: true
            }
          ),
        };
      } catch (error) {
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
