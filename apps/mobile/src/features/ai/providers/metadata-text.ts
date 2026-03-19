import type { MetadataInput } from '../metadata/types';

/**
 * Build a prompt for summary generation.
 */
export function buildSummaryPrompt(input: MetadataInput): string {
  const content = input.title
    ? `Title: ${input.title}\n\nContent: ${input.content}`
    : input.content;

  return `Summarize the following content in 1-2 concise sentences. Only output the summary, nothing else.

${content}`;
}

/**
 * Build a prompt for tag generation.
 */
export function buildTagsPrompt(input: MetadataInput): string {
  const content = input.title
    ? `Title: ${input.title}\n\nContent: ${input.content}`
    : input.content;

  return `Extract 3-5 relevant tags from the following content. Output only the tags as a comma-separated list, nothing else.

${content}`;
}

/**
 * Parse tags from generated text.
 */
export function parseTagsResponse(response: string): string[] {
  const tags = response
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.length < 50)
    .map((tag) => tag.replace(/^["'#]+|["'#]+$/g, '').trim())
    .filter((tag) => tag.length > 0);

  return [...new Set(tags)].slice(0, 5);
}

