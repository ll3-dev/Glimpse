/**
 * Rules-based Provider
 *
 * Pure keyword / heuristic metadata generation. Always available.
 * Uses no external API or LLM -- suitable as a fallback.
 *
 * Adapted from the mobile app's capture/stubs.ts.
 */

import type { AIProvider, CompletionRequest, CompletionResponse, MetadataOutput } from '../types';

// ---------------------------------------------------------------------------
// Keyword heuristics
// ---------------------------------------------------------------------------

function extractSummary(content: string): string {
  if (!content || content.trim().length === 0) return '';

  const preview = content.trim().substring(0, 100);
  return `${preview}${content.length > 100 ? '...' : ''}`;
}

function extractTags(content: string): string[] {
  if (!content || content.trim().length === 0) return [];

  const tags: string[] = [];
  const lower = content.toLowerCase();

  if (lower.includes('http') || lower.includes('www')) tags.push('link');
  if (lower.includes('todo') || lower.includes('task') || lower.includes('\uD560\uC77C')) tags.push('todo');
  if (lower.includes('important') || lower.includes('urgent') || lower.includes('\uC911\uC694')) tags.push('important');
  if (lower.includes('idea') || lower.includes('brainstorm') || lower.includes('\uC544\uC774\uB514\uC5B4')) tags.push('idea');

  // Extract meaningful tokens
  const tokens = lower.match(/[a-z0-9]{2,}|[\uAC00-\uD7A3]{2,}/g) ?? [];
  const stopwords = new Set([
    'http', 'https', 'www', 'com', 'and', 'the', 'this', 'that',
    'with', 'from', 'read', 'later', 'check',
    '\uAD00\uB828', '\uB0B4\uC6A9', '\uBA54\uBAA8', '\uB9C1\uD06C', '\uC800\uC7A5',
  ]);

  for (const token of tokens) {
    if (stopwords.has(token) || /^\d+$/.test(token)) continue;
    tags.push(token);
    if (tags.length >= 6) break;
  }

  return [...new Set(tags)];
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const rulesProvider: AIProvider = {
  kind: 'rules',

  async isAvailable(): Promise<boolean> {
    return true;
  },

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Rules provider echoes a truncated version of the prompt
    const preview = request.prompt.length > 200
      ? request.prompt.slice(0, 200) + '...'
      : request.prompt;

    return {
      text: `[Rules] ${preview}`,
      provider: 'rules',
    };
  },

  async generateMetadata(content: string, title?: string | null): Promise<MetadataOutput> {
    const combined = title ? `${title}\n\n${content}` : content;
    return {
      summary: extractSummary(combined),
      tags: extractTags(combined),
    };
  },
};
