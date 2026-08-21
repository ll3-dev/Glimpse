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
  // Metadata generation is a pure request and does not mutate query-backed state.
  // react-doctor-disable-next-line react-doctor/query-mutation-missing-invalidation
  return useMutation<MetadataOutput, Error, UseMetadataGenerationInput>({
    mutationFn: async ({ content, title }) => {
      return generateMetadata(content, title);
    },
  });
}
