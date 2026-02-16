import type { KnowledgeItemInput } from './saveKnowledgeItem.types';
import { generateId as generateRuntimeId } from '@/src/lib/id';

export function generateId(): string {
  return generateRuntimeId();
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
