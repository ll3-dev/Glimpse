import type { KnowledgeItemInput } from './types';

export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}
export function createContentForProcessing(input: KnowledgeItemInput): string {
  switch (input.type) {
    case 'note': return [input.title, input.body].filter(Boolean).join('\n\n');
    case 'link': return [input.title, input.body, input.url].filter(Boolean).join('\n\n');
    case 'highlight':
      return [input.title, input.text ?? input.body, input.sourceUrl].filter(Boolean).join('\n\n');
    case 'screenshot': return [input.title, input.body].filter(Boolean).join('\n\n');
    case 'share': return [input.title, input.body, input.url].filter(Boolean).join('\n\n');
    default: return '';
  }
}
