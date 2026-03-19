import type {
  HighlightInput,
  KnowledgeItemInput,
  LinkInput,
  NoteInput,
  ScreenshotInput,
  ShareInput,
} from './saveKnowledgeItem.types';

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateNoteInput(input: NoteInput): string | null {
  if (!input.body || input.body.trim().length === 0) {
    return 'Note body is required and cannot be empty';
  }
  return null;
}

function validateLinkInput(input: LinkInput): string | null {
  if (!input.url || input.url.trim().length === 0) {
    return 'Link URL is required and cannot be empty';
  }

  if (!isValidUrl(input.url)) {
    return 'Invalid URL format';
  }

  return null;
}

function validateHighlightInput(input: HighlightInput): string | null {
  if (!input.body || input.body.trim().length === 0) {
    return 'Highlight text is required and cannot be empty';
  }
  return null;
}

function validateScreenshotInput(input: ScreenshotInput): string | null {
  if (!input.body || input.body.trim().length === 0) {
    return 'Screenshot text is required and cannot be empty';
  }
  return null;
}

function validateShareInput(input: ShareInput): string | null {
  if (!input.body?.trim() && !input.url?.trim()) {
    return 'Share content is required (body or URL)';
  }

  if (input.url && !isValidUrl(input.url)) {
    return 'Invalid URL format';
  }

  return null;
}

export function validateInput(input: KnowledgeItemInput): string | null {
  switch (input.type) {
    case 'note':
      return validateNoteInput(input);
    case 'link':
      return validateLinkInput(input);
    case 'highlight':
      return validateHighlightInput(input);
    case 'screenshot':
      return validateScreenshotInput(input);
    case 'share':
      return validateShareInput(input);
    default:
      return 'Unknown item type';
  }
}
