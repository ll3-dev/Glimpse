import { db, knowledgeItems, type KnowledgeItem } from '@/src/db';
import { generateSummaryStub, generateTagsStub } from './stubs';
import { initializeReviewSchedule } from '../review';
import { logger } from '@/src/utils/logger';
import type { FailureResult, Result } from '@/src/lib/effect-result';

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

export interface SaveKnowledgeItemDeps {
  db: typeof db;
  knowledgeItems: typeof knowledgeItems;
  generateSummaryStub: typeof generateSummaryStub;
  generateTagsStub: typeof generateTagsStub;
  initializeReviewSchedule: typeof initializeReviewSchedule;
  logger: Pick<typeof logger, 'error'>;
}
