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

import { Effect } from 'effect';
import { db, knowledgeItems, type KnowledgeItem, type NewKnowledgeItem } from '@/src/db';
import { generateSummaryStub, generateTagsStub } from './stubs';
import { logger } from '@/src/utils/logger';
import { initializeReviewSchedule } from '../review';
import {
  appError,
  isFailure,
  type FailureResult,
  type Result,
  runEffectResult,
  tryPromise,
} from '@/src/lib/effect-result';

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
 * Input type for creating a screenshot
 */
export interface ScreenshotInput {
  type: 'screenshot';
  title?: string;
  body: string; // OCR extracted text
}

/**
 * Input type for creating a shared item
 */
export interface ShareInput {
  type: 'share';
  title?: string;
  body?: string;
  url?: string;
}

/**
 * Union type for all knowledge item inputs
 */
export type KnowledgeItemInput =
  | NoteInput
  | LinkInput
  | HighlightInput
  | ScreenshotInput
  | ShareInput;

/**
 * Success result type
 */
export type SaveSuccessResult = { success: true; data: KnowledgeItem };

/**
 * Failure result type
 */
export type SaveFailureResult = FailureResult;

/**
 * Union result type for save operation
 */
export type SaveResult = Result<KnowledgeItem>;

export interface SaveKnowledgeItemDeps {
  db: typeof db;
  knowledgeItems: typeof knowledgeItems;
  generateSummaryStub: typeof generateSummaryStub;
  generateTagsStub: typeof generateTagsStub;
  initializeReviewSchedule: typeof initializeReviewSchedule;
  logger: Pick<typeof logger, 'error'>;
}

const defaultDeps: SaveKnowledgeItemDeps = {
  db,
  knowledgeItems,
  generateSummaryStub,
  generateTagsStub,
  initializeReviewSchedule,
  logger,
};

/**
 * Generates a unique ID using timestamp and random suffix
 * Format: timestamp-randomString (simple cuid-like approach)
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

function isValidUrl(value: string): boolean {
  return Effect.runSync(
    Effect.match(
      Effect.try({
        try: () => new URL(value),
        catch: () => null,
      }),
      {
        onFailure: () => false,
        onSuccess: () => true,
      }
    )
  );
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

  if (!isValidUrl(input.url)) {
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
 * Validates screenshot input
 */
function validateScreenshotInput(input: ScreenshotInput): string | null {
  if (!input.body || input.body.trim().length === 0) {
    return 'Screenshot text is required and cannot be empty';
  }
  return null;
}

/**
 * Validates share input
 */
function validateShareInput(input: ShareInput): string | null {
  if (!input.body?.trim() && !input.url?.trim()) {
    return 'Share content is required (body or URL)';
  }
  if (input.url && !isValidUrl(input.url)) {
    return 'Invalid URL format';
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
  if (input.type === 'screenshot') {
    return validateScreenshotInput(input);
  }
  if (input.type === 'share') {
    return validateShareInput(input);
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

  if (input.type === 'share' && input.url) {
    parts.push(input.url);
  }

  return parts.join('\n');
}

/**
 * Saves a knowledge item (note, link, or highlight) to the database.
 */
export function createSaveKnowledgeItem(deps: SaveKnowledgeItemDeps = defaultDeps) {
  return async function saveKnowledgeItem(input: KnowledgeItemInput): Promise<SaveResult> {
    const validationError = validateInput(input);
    if (validationError) {
      return {
        success: false,
        error: appError('VALIDATION_ERROR', validationError),
      };
    }

    const program = Effect.gen(function* () {
      const id = generateId();
      const now = Date.now();

      const contentForProcessing = createContentForProcessing(input);
      const summary = deps.generateSummaryStub(contentForProcessing);
      const tags = deps.generateTagsStub(contentForProcessing);

      const newKnowledgeItem: NewKnowledgeItem = {
        id,
        type: input.type,
        title: normalizeText(input.title),
        body: normalizeText(input.body),
        url:
          (input.type === 'link' || input.type === 'share') && input.url
            ? input.url.trim()
            : null,
        summary,
        tags,
        createdAt: now,
        updatedAt: now,
        ...deps.initializeReviewSchedule(now),
      };

      yield* tryPromise(
        () => deps.db.insert(deps.knowledgeItems).values(newKnowledgeItem),
        (error) => appError('DATABASE_ERROR', 'Failed to save knowledge item', error)
      );

      return newKnowledgeItem as KnowledgeItem;
    });

    const result = await runEffectResult(program);
    if (isFailure(result)) {
      deps.logger.error('saveKnowledgeItem failed', result.error, { inputType: input.type });
    }

    return result;
  };
}

export const saveKnowledgeItem = createSaveKnowledgeItem();
