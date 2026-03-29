/**
 * Prompt construction and response parsing for LLM-based metadata generation.
 *
 * Adapted from the mobile app's metadata-text.ts but without Effect dependency.
 */

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

export function buildSummaryPrompt(content: string, title?: string | null): string {
  const context = title ? `Title: ${title}\n\nContent: ${content}` : content;

  return `Summarize the following content in 1-2 concise sentences. Only output the summary, nothing else.

${context}`;
}

export function buildTagsPrompt(content: string, title?: string | null): string {
  const context = title ? `Title: ${title}\n\nContent: ${content}` : content;

  return `Extract 3-5 relevant tags from the following content. Output only the tags as a comma-separated list, nothing else.

${context}`;
}

// ---------------------------------------------------------------------------
// Response parsers
// ---------------------------------------------------------------------------

export function parseTagsResponse(response: string): string[] {
  const tags = response
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.length < 50)
    .map((tag) => tag.replace(/^["'#]+|["'#]+$/g, '').trim())
    .filter((tag) => tag.length > 0);

  return [...new Set(tags)].slice(0, 5);
}
