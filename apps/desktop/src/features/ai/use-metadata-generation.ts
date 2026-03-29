/**
 * TanStack Query mutation hook for metadata generation.
 *
 * Uses the AI router's metadata feature to generate summary + tags
 * for saved content.
 */

import { useMutation } from '@tanstack/react-query';
import { generateMetadata } from './router';
import type { MetadataOutput } from './types';

export interface UseMetadataGenerationInput {
  content: string;
  title?: string | null;
}

export function useMetadataGeneration() {
  return useMutation<MetadataOutput, Error, UseMetadataGenerationInput>({
    mutationFn: async ({ content, title }) => {
      return generateMetadata(content, title);
    },
  });
}
