/**
 * Stub Provider
 *
 * Echo-based provider for development and testing. Always available.
 */

import { buildSummaryPreview } from '@glimpse/features';
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

    return {
      // 공유 미리보기 빌더(첫 완결 문장, 140자 경계 절단)로 스텁 품질 개선
      summary: buildSummaryPreview(combined),
      tags: ['stub'],
    };
  },
};
