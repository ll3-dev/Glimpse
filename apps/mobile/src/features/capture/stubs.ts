/**
 * Stub functions for AI-generated metadata
 *
 * These are placeholder implementations that return mock data.
 * They will be replaced with actual Local LLM inference in future versions.
 */

/**
 * Generates a placeholder summary for the given content.
 *
 * This is a stub implementation that returns a fixed placeholder text.
 * In the future, this will:
 * - Use Local LLM to generate actual summaries
 * - Handle different content types (notes vs links)
 * - Support configurable summary lengths
 *
 * @param content - The content to summarize
 * @returns A placeholder summary string
 */
export function generateSummaryStub(content: string): string {
  // Return empty string for empty content
  if (!content || content.trim().length === 0) {
    return '';
  }

  // Extract first 100 characters as a preview (simple stub behavior)
  const preview = content.trim().substring(0, 100);

  // Return placeholder with content preview
  return `[Stub Summary] ${preview}${content.length > 100 ? '...' : ''}`;
}

/**
 * Generates placeholder tags for the given content.
 *
 * This is a stub implementation that returns heuristic tags.
 * In the future, this will:
 * - Use Local LLM to extract relevant tags
 * - Support tag normalization and deduplication
 * - Integrate with existing tag vocabulary
 *
 * @param content - The content to tag
 * @returns An array of placeholder tag strings
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
