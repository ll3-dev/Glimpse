/**
 * Save Knowledge Item Use Case
 *
 * Handles the creation and persistence of knowledge items (notes, links, highlights).
 * This function orchestrates:
 * 1. Input validation and normalization
 * 2. ID generation
 * 3. Timestamp setting
 * 4. Summary and tags generation (via stubs)
 * 5. Database insertion
 */

import { db, knowledgeItems, type KnowledgeItem, type NewKnowledgeItem } from '@/src/db';
import { generateSummaryStub, generateTagsStub } from './stubs';
import { logger } from '@/src/utils/logger';

/**
 * Input type for creating a note
 */
export interface NoteInput {
  type: 'note';
  title?: string;
  body: string;
}

/**
 * Input type for creating a link
 */
export interface LinkInput {
  type: 'link';
  title?: string;
  url: string;
  body?: string; // Optional annotation/note for the link
}

/**
 * Input type for creating a highlight
 */
export interface HighlightInput {
  type: 'highlight';
  title?: string; // Source (book title, URL, etc.)
  body: string;
}

/**
 * Union type for all knowledge item inputs
 */
export type KnowledgeItemInput = NoteInput | LinkInput | HighlightInput;

/**
 * Success result type
 */
export interface SaveSuccessResult {
  success: true;
  data: KnowledgeItem;
}

/**
 * Failure result type
 */
export interface SaveFailureResult {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Union result type for save operation
 */
export type SaveResult = SaveSuccessResult | SaveFailureResult;

/**
 * Generates a unique ID using timestamp and random suffix
 * Format: timestamp-randomString (simple cuid-like approach)
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

/**
 * Validates note input
 */
function validateNoteInput(input: NoteInput): string | null {
  if (!input.body || input.body.trim().length === 0) {
    return 'Note body is required and cannot be empty';
  }
  return null;
}

/**
 * Validates link input
 */
function validateLinkInput(input: LinkInput): string | null {
  if (!input.url || input.url.trim().length === 0) {
    return 'Link URL is required and cannot be empty';
  }

  // Basic URL validation
  try {
    new URL(input.url);
  } catch {
    return 'Invalid URL format';
  }

  return null;
}

/**
 * Validates highlight input
 */
function validateHighlightInput(input: HighlightInput): string | null {
  if (!input.body || input.body.trim().length === 0) {
    return 'Highlight text is required and cannot be empty';
  }
  return null;
}

/**
 * Validates knowledge item input based on type
 */
function validateInput(input: KnowledgeItemInput): string | null {
  if (input.type === 'note') {
    return validateNoteInput(input);
  }
  if (input.type === 'link') {
    return validateLinkInput(input);
  }
  if (input.type === 'highlight') {
    return validateHighlightInput(input);
  }
  return 'Unknown item type';
}

/**
 * Normalizes text content by trimming whitespace
 */
function normalizeText(text: string | undefined): string | undefined {
  return text?.trim() || undefined;
}

/**
 * Creates content string for summary/tags generation
 * Combines title, body, and URL (for links) into a single string
 */
function createContentForProcessing(input: KnowledgeItemInput): string {
  const parts: string[] = [];

  if (input.title) {
    parts.push(input.title);
  }

  if (input.body) {
    parts.push(input.body);
  }

  if (input.type === 'link' && input.url) {
    parts.push(input.url);
  }

  return parts.join('\n');
}

/**
 * Saves a knowledge item (note, link, or highlight) to the database.
 *
 * This function:
 * 1. Validates the input
 * 2. Generates a unique ID
 * 3. Sets timestamps
 * 4. Generates summary and tags using stub functions
 * 5. Inserts the item into the database
 *
 * @param input - The knowledge item input (NoteInput, LinkInput, or HighlightInput)
 * @returns A SaveResult indicating success or failure
 *
 * @example
 * // Save a note
 * const result = await saveKnowledgeItem({
 *   type: 'note',
 *   title: 'My Note',
 *   body: 'This is the content of my note'
 * });
 *
 * @example
 * // Save a link
 * const result = await saveKnowledgeItem({
 *   type: 'link',
 *   url: 'https://example.com',
 *   body: 'Interesting article about something'
 * });
 */
export async function saveKnowledgeItem(
  input: KnowledgeItemInput
): Promise<SaveResult> {
  try {
    // Validate input
    const validationError = validateInput(input);
    if (validationError) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validationError,
        },
      };
    }

    // Generate ID and timestamps
    const id = generateId();
    const now = Date.now();

    // Create content for processing
    const contentForProcessing = createContentForProcessing(input);

    // Generate summary and tags using stub functions
    const summary = generateSummaryStub(contentForProcessing);
    const tags = generateTagsStub(contentForProcessing);

    // Build the new knowledge item
    const newKnowledgeItem: NewKnowledgeItem = {
      id,
      type: input.type,
      title: normalizeText(input.title),
      body: normalizeText(input.body),
      url: input.type === 'link' ? input.url.trim() : null,
      summary,
      tags,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    await db.insert(knowledgeItems).values(newKnowledgeItem);

    // Return success with the created item
    return {
      success: true,
      data: newKnowledgeItem as KnowledgeItem,
    };
  } catch (error) {
    logger.error('saveKnowledgeItem failed', error, { inputType: input.type });

    // Handle database or unexpected errors
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to save knowledge item',
        details: error instanceof Error ? error.message : error,
      },
    };
  }
}
