/**
 * Capture Application Layer
 * Migrated from @glimpse/core/application/capture
 */

import type { KnowledgeItem, InitializeReviewScheduleOutput } from '@glimpse/shared';
import type { MetadataInput } from '@/src/features/ai/metadata/types';

// ============================================================================
// Types
// ============================================================================

export type KnowledgeItemType = 'note' | 'link' | 'highlight' | 'screenshot' | 'share';

export interface NoteInput {
  type: 'note';
  title?: string | null;
  body: string;
  tags?: string[] | null;
}

export interface LinkInput {
  type: 'link';
  url: string;
  title?: string | null;
  body?: string | null;
  tags?: string[] | null;
}

export interface HighlightInput {
  type: 'highlight';
  text?: string | null;
  sourceUrl?: string | null;
  title?: string | null;
  tags?: string[] | null;
  body?: string | null; // For backward compatibility
}

export interface ScreenshotInput {
  type: 'screenshot';
  imageData?: string | null;
  title?: string | null;
  tags?: string[] | null;
  body?: string | null; // For backward compatibility - extracted text
}

export interface ShareInput {
  type: 'share';
  url?: string | null;
  title?: string | null;
  body?: string | null;
  tags?: string[] | null;
}

export type KnowledgeItemInput =
  | NoteInput
  | LinkInput
  | HighlightInput
  | ScreenshotInput
  | ShareInput;

export interface GenerateMetadata {
  summary: string;
  tags: string[];
}

export type GenerateMetadataFn = (input: KnowledgeItemInput) => Promise<GenerateMetadata>;

function assertNever(value: never): never {
  throw new Error(`Unknown input type: ${JSON.stringify((value as KnowledgeItemInput).type)}`);
}

function mapToMetadataInput(input: KnowledgeItemInput): MetadataInput {
  switch (input.type) {
    case 'note':
      return { content: input.body, title: input.title, type: 'note' };
    case 'link':
      return { content: input.body ?? input.url ?? '', title: input.title, type: 'link' };
    case 'highlight':
      return { content: input.text ?? input.body ?? '', title: input.title, type: 'highlight' };
    case 'screenshot':
      return { content: input.body ?? '', title: input.title, type: 'screenshot' };
    case 'share':
      return { content: input.body ?? input.url ?? '', title: input.title, type: 'share' };
    default:
      return assertNever(input);
  }
}

function resolveBodyValue(input: KnowledgeItemInput): string | null {
  switch (input.type) {
    case 'note':
    case 'link':
    case 'share':
      return input.body;
    case 'highlight':
      return input.text ?? input.body;
    case 'screenshot':
      return input.body ?? null;
    default:
      return assertNever(input);
  }
}

function resolveUrlValue(input: KnowledgeItemInput): string | null {
  switch (input.type) {
    case 'link':
    case 'share':
      return input.url ?? null;
    case 'highlight':
      return input.sourceUrl ?? null;
    case 'note':
    case 'screenshot':
      return null;
    default:
      return assertNever(input);
  }
}

export interface SaveKnowledgeItemDeps {
  coreClient: {
    saveKnowledgeItem: (item: KnowledgeItem) => Promise<KnowledgeItem>;
  };
  generateMetadata: (input: MetadataInput) => Promise<GenerateMetadata>;
  initializeReviewSchedule: (createdAt: number) => Promise<InitializeReviewScheduleOutput>;
  logger: { error: (message: string, meta?: unknown) => void };
  generateId: () => string;
  isIdCollisionError: (error: unknown) => boolean;
  maxIdCollisionRetries: number;
}

export interface SaveSuccessResult {
  success: true;
  item: KnowledgeItem;
}

export interface SaveFailureResult {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type SaveResult = SaveSuccessResult | SaveFailureResult;

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export function validateInput(input: KnowledgeItemInput): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (input.type) {
    case 'note':
      if (!input.body?.trim()) {
        errors.push({ field: 'body', message: 'Body is required for notes' });
      }
      break;
    case 'link':
      if (!input.url?.trim()) {
        errors.push({ field: 'url', message: 'URL is required for links' });
      }
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

// ============================================================================
// Transform Functions
// ============================================================================

export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function createContentForProcessing(input: KnowledgeItemInput): string {
  switch (input.type) {
    case 'note':
      return [input.title, input.body].filter(Boolean).join('\n\n');
    case 'link':
      return [input.title, input.body, input.url].filter(Boolean).join('\n\n');
    case 'highlight':
      return [input.title, input.text ?? input.body, input.sourceUrl].filter(Boolean).join('\n\n');
    case 'screenshot':
      return [input.title, input.body].filter(Boolean).join('\n\n');
    case 'share':
      return [input.title, input.body, input.url].filter(Boolean).join('\n\n');
    default:
      return '';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSaveKnowledgeItem(deps: SaveKnowledgeItemDeps) {
  return async (input: KnowledgeItemInput): Promise<SaveResult> => {
    const validationErrors = validateInput(input);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: validationErrors.map((e) => e.message).join(", "),
        },
      };
    }

    try {
      const metadataInput = mapToMetadataInput(input);
      const metadata = await deps.generateMetadata(metadataInput);
      const now = Date.now();
      const reviewSchedule = await deps.initializeReviewSchedule(now);
      const bodyValue = resolveBodyValue(input);
      const urlValue = resolveUrlValue(input);

      let retries = 0;
      while (retries < deps.maxIdCollisionRetries) {
        const id = deps.generateId();
        const item: KnowledgeItem = {
          id,
          type: input.type,
          title: input.title,
          body: bodyValue ?? metadata.summary,
          url: urlValue,
          summary: metadata.summary,
          tags: input.tags ?? metadata.tags,
          labels: null,
          provisionalLabels: null,
          labelStatus: null,
          labelSource: null,
          labelVersion: null,
          labelScore: null,
          labelRequestedAt: null,
          labelCompletedAt: null,
          labelError: null,
          createdAt: now,
          updatedAt: now,
          stability: reviewSchedule.stability,
          difficulty: reviewSchedule.difficulty,
          lastReviewedAt: reviewSchedule.lastReviewedAt,
          nextReviewAt: reviewSchedule.nextReviewAt,
        };

        try {
          const saved = await deps.coreClient.saveKnowledgeItem(item);
          return { success: true, item: saved };
        } catch (error) {
          if (deps.isIdCollisionError(error)) {
            retries++;
            continue;
          }
          throw error;
        }
      }

      return {
        success: false,
        error: {
          code: 'MAX_RETRIES_EXCEEDED',
          message: 'Max ID collision retries exceeded',
        },
      };
    } catch (error) {
      deps.logger.error('Failed to save knowledge item', { error, input });
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: String(error) },
      };
    }
  };
}
