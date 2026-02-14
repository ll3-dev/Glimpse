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
 * This is a stub implementation that returns mock tags.
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

  // Simple stub: return some placeholder tags based on content analysis
  const tags: string[] = ['stub-tag'];

  // Add type-based tags (simple heuristic)
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('http') || lowerContent.includes('www')) {
    tags.push('link');
  }

  if (lowerContent.includes('todo') || lowerContent.includes('task')) {
    tags.push('todo');
  }

  if (lowerContent.includes('important') || lowerContent.includes('urgent')) {
    tags.push('important');
  }

  if (lowerContent.includes('idea') || lowerContent.includes('brainstorm')) {
    tags.push('idea');
  }

  // Return unique tags
  return [...new Set(tags)];
}
