import type { KnowledgeItem } from '@glimpse/shared';
import type { CoreClient } from '../../ports/core-client';
import type { FailureResult, Result } from '../../foundation/effect-result';
import type { MetadataInput, MetadataOutput } from '../../ai/metadata';

export interface NoteInput {
  type: 'note';
  title?: string;
  body: string;
}

export interface LinkInput {
  type: 'link';
  title?: string;
  url: string;
  body?: string;
}

export interface HighlightInput {
  type: 'highlight';
  title?: string;
  body: string;
}

export interface ScreenshotInput {
  type: 'screenshot';
  title?: string;
  body: string;
}

export interface ShareInput {
  type: 'share';
  title?: string;
  body?: string;
  url?: string;
}

export type KnowledgeItemInput =
  | NoteInput
  | LinkInput
  | HighlightInput
  | ScreenshotInput
  | ShareInput;

export type SaveSuccessResult = { success: true; data: KnowledgeItem };
export type SaveFailureResult = FailureResult;
export type SaveResult = Result<KnowledgeItem>;

/**
 * Metadata generator function type
 *
 * Replaces the previous generateSummaryStub/generateTagsStub pair.
 * Uses the AI metadata router to generate summary and tags.
 */
export type GenerateMetadata = (
  input: MetadataInput
) => Promise<Result<MetadataOutput>>;

export interface SaveKnowledgeItemDeps {
  coreClient: Pick<CoreClient, 'saveKnowledgeItem'>;
  generateMetadata: GenerateMetadata;
  initializeReviewSchedule: (createdAt: number) => {
    nextReviewAt: number;
    stability: number | null;
    difficulty: number | null;
    lastReviewedAt: number | null;
  };
  logger: {
    error(message: string, error?: unknown, context?: Record<string, unknown>): void;
  };
  generateId: () => string;
  isIdCollisionError: (error: unknown) => boolean;
  maxIdCollisionRetries: number;
}
