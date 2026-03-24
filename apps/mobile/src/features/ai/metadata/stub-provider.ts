/**
 * Stub Metadata Provider
 *
 * Default provider using heuristic-based stub functions.
 * Used when the app stays in the default inference mode.
 */

import type { Result } from '@/src/lib/effect-result';
import { appError } from '@/src/lib/effect-result';
import { generateSummaryStub, generateTagsStub } from '@/src/features/capture/stubs';
import type { MetadataProvider, MetadataInput, MetadataOutput } from './types';

/**
 * Stub provider that wraps existing stub functions.
 * Always available in default mode.
 */
export const stubProvider: MetadataProvider = {
  name: 'stub',

  async isAvailable(): Promise<boolean> {
    // Stub is always available
    return true;
  },

  async generate(input: MetadataInput): Promise<Result<MetadataOutput>> {
    try {
      const content = input.title
        ? `${input.title}\n\n${input.content}`
        : input.content;

      const summary = generateSummaryStub(content);
      const tags = generateTagsStub(content);

      return {
        success: true,
        data: { summary, tags },
      };
    } catch (error) {
      return {
        success: false,
        error: appError(
          'GENERATION_ERROR',
          'Stub generation failed',
          { provider: 'stub', cause: error }
        ),
      };
    }
  },
};
