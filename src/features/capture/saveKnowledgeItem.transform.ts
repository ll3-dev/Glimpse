import type { KnowledgeItemInput } from './saveKnowledgeItem.types';

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

export function normalizeText(text: string | undefined): string | undefined {
  return text?.trim() || undefined;
}

export function createContentForProcessing(input: KnowledgeItemInput): string {
  const parts: string[] = [];

  if (input.title) {
    parts.push(input.title);
  }

  if (input.body) {
    parts.push(input.body);
  }

  if ((input.type === 'link' || input.type === 'share') && input.url) {
    parts.push(input.url);
  }

  return parts.join('\n');
}
