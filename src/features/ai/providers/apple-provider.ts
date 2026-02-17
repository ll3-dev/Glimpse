/**
 * Apple Intelligence Metadata Provider
 *
 * Uses Apple's on-device Foundation Models for metadata generation.
 * Available on iOS 18.1+ and macOS 15.1+.
 */

import type { Result } from '@/src/lib/effect-result';
import type { MetadataProvider, MetadataInput, MetadataOutput } from '../metadata/types';
import { aiProviderError } from '../metadata/types';
import {
  createAppleIntelligenceBridge,
  type AppleIntelligenceBridge,
} from '../apple-intelligence-bridge';
import { isAppleIntelligenceEnabled } from '@/src/features/settings/appleIntelligenceToggle';

/**
 * Apple provider configuration
 */
export interface AppleProviderConfig {
  /** Custom bridge instance (for testing) */
  bridge?: AppleIntelligenceBridge;
  /** Check if toggle is enabled (defaults to isAppleIntelligenceEnabled from store) */
  isToggleEnabled?: () => boolean;
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
 * Parse tags from response
 */
function parseTagsResponse(response: string): string[] {
  const tags = response
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.length < 50)
    .map((tag) => tag.replace(/^["'#]+|["'#]+$/g, '').trim())
    .filter((tag) => tag.length > 0);

  return [...new Set(tags)].slice(0, 5);
}

/**
 * Create an Apple Intelligence metadata provider.
 *
 * Availability requirements:
 * - iOS 18.1+ or macOS 15.1+
 * - User has enabled Apple Intelligence toggle
 * - Device supports Apple Intelligence (A17+ or M-series chip)
 */
export function createAppleProvider(config: AppleProviderConfig = {}): MetadataProvider {
  const bridge = config.bridge ?? createAppleIntelligenceBridge();
  const isToggleEnabled = config.isToggleEnabled ?? isAppleIntelligenceEnabled;

  return {
    name: 'apple',

    async isAvailable(): Promise<boolean> {
      // Check if toggle is enabled
      if (!isToggleEnabled()) {
        return false;
      }

      // Check native availability
      const { available } = await bridge.isAvailable();
      return available;
    },

    async generate(input: MetadataInput): Promise<Result<MetadataOutput>> {
      // Check toggle first
      if (!isToggleEnabled()) {
        return {
          success: false,
          error: aiProviderError(
            'AI_PROVIDER_UNAVAILABLE',
            'apple',
            'Apple Intelligence is disabled in settings'
          ),
        };
      }

      // Check native availability
      const availability = await bridge.isAvailable();
      if (!availability.available) {
        return {
          success: false,
          error: aiProviderError(
            'AI_PROVIDER_UNAVAILABLE',
            'apple',
            `Apple Intelligence is not available: ${availability.reason ?? 'unknown'}`,
            { reason: availability.reason }
          ),
        };
      }

      try {
        // Generate summary
        const summaryPrompt = buildSummaryPrompt(input);
        const summaryResult = await bridge.generate(summaryPrompt, {
          maxTokens: 128,
          temperature: 0.3,
        });

        // Generate tags
        const tagsPrompt = buildTagsPrompt(input);
        const tagsResult = await bridge.generate(tagsPrompt, {
          maxTokens: 64,
          temperature: 0.3,
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
        // Map error to provider error
        const message =
          error instanceof Error ? error.message : 'Apple Intelligence generation failed';

        return {
          success: false,
          error: aiProviderError(
            'AI_PROVIDER_INTERNAL_ERROR',
            'apple',
            message,
            { cause: error }
          ),
        };
      }
    },
  };
}

/**
 * Default Apple provider instance
 *
 * Uses isAppleIntelligenceEnabled() from the settings store.
 */
export const appleProvider = createAppleProvider();

// Export helper functions for testing
export { buildSummaryPrompt, buildTagsPrompt, parseTagsResponse };
