/**
 * Stub Provider
 *
 * Echo-based provider for development and testing. Always available.
 */

import type { AIProvider, CompletionRequest, CompletionResponse, MetadataOutput } from '../types';

export const stubProvider: AIProvider = {
  kind: 'stub',

  async isAvailable(): Promise<boolean> {
    return true;
  },

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const preview = request.prompt.length > 100
      ? request.prompt.slice(0, 100) + '...'
      : request.prompt;

    return {
      text: `[Echo] You said: "${preview}"`,
      provider: 'stub',
    };
  },

  async generateMetadata(content: string, title?: string | null): Promise<MetadataOutput> {
    const combined = title ? `${title}\n\n${content}` : content;
    const preview = combined.length > 100
      ? combined.slice(0, 100) + '...'
      : combined;

    return {
      summary: `[Stub Summary] ${preview}`,
      tags: ['stub'],
    };
  },
};
