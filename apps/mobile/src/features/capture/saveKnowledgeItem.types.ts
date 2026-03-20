import type { KnowledgeItem } from '@glimpse/shared';
import type { MobileCoreClient } from '@/src/features/core';
import { initializeReviewSchedule } from '../review';
import { logger } from '@/src/utils/logger';
import type { FailureResult, Result } from '@/src/lib/effect-result';
import type { MetadataInput, MetadataOutput } from '@/src/features/ai/metadata';

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
  coreClient: Pick<MobileCoreClient, 'saveKnowledgeItem'>;
  generateMetadata: GenerateMetadata;
  initializeReviewSchedule: typeof initializeReviewSchedule;
  logger: Pick<typeof logger, 'error'>;
}
