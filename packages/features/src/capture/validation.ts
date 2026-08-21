import type { KnowledgeItemInput, ValidationError } from './types';

export function validateInput(input: KnowledgeItemInput): ValidationError[] {
  const errors: ValidationError[] = [];
  switch (input.type) {
    case 'note':
      if (!input.body?.trim()) errors.push({ field: 'body', message: 'Body is required for notes' });
      break;
    case 'link':
      if (!input.url?.trim()) errors.push({ field: 'url', message: 'URL is required for links' });
      break;
    case 'highlight':
      if (!input.text?.trim() && !input.body?.trim()) {
        errors.push({ field: 'text', message: 'Text is required for highlights' });
      }
      break;
    case 'screenshot':
      if (!input.imageData?.trim() && !input.body?.trim()) {
        errors.push({ field: 'imageData', message: 'Image data is required for screenshots' });
      }
      break;
    case 'share':
      if (!input.url?.trim() && !input.body?.trim()) {
        errors.push({ field: 'url', message: 'URL or body is required for shares' });
      }
      break;
    default:
      errors.push({ field: 'type', message: `Unknown type: ${(input as { type: string }).type}` });
  }
  return errors;
}
