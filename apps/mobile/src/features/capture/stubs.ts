/**
 * Deterministic fallback functions for AI-generated metadata.
 *
 * These keep capture usable without a configured model while clearly returning
 * only a local preview and heuristic tags.
 */

import { buildSummaryPreview } from '@glimpse/features';

/**
 * Generates a local preview for the given content.
 * 공유 미리보기 빌더(첫 완결 문장, 140자 경계 절단)에 위임한다.
 *
 * @param content - The content to summarize
 * @returns A truncated content preview
 */
export function generateSummaryStub(content: string): string {
  return buildSummaryPreview(content);
}

/**
 * Generates heuristic tags for the given content.
 *
 * @param content - The content to tag
 * @returns An array of local heuristic tag strings
 */
export function generateTagsStub(content: string): string[] {
  // Return empty array for empty content
  if (!content || content.trim().length === 0) {
    return [];
  }

  const tags: string[] = [];

  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('http') || lowerContent.includes('www')) {
    tags.push('link');
  }

  if (
    lowerContent.includes('todo') ||
    lowerContent.includes('task') ||
    lowerContent.includes('할일')
  ) {
    tags.push('todo');
  }

  if (
    lowerContent.includes('important') ||
    lowerContent.includes('urgent') ||
    lowerContent.includes('중요')
  ) {
    tags.push('important');
  }

  if (
    lowerContent.includes('idea') ||
    lowerContent.includes('brainstorm') ||
    lowerContent.includes('아이디어')
  ) {
    tags.push('idea');
  }

  const tokenMatches = lowerContent.match(/[a-z0-9]{2,}|[가-힣]{2,}/g) ?? [];
  const stopwords = new Set([
    'http',
    'https',
    'www',
    'com',
    'and',
    'the',
    'this',
    'that',
    'with',
    'from',
    'read',
    'later',
    'check',
    '관련',
    '내용',
    '메모',
    '링크',
    '저장',
  ]);

  for (const token of tokenMatches) {
    if (stopwords.has(token)) {
      continue;
    }
    if (/^\d+$/.test(token)) {
      continue;
    }
    tags.push(token);
    if (tags.length >= 6) {
      break;
    }
  }

  // Return unique tags
  return [...new Set(tags)];
}
