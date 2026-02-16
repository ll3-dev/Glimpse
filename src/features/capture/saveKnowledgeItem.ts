import { Effect } from 'effect';
import {
  appError,
  isFailure,
  runEffectResult,
  tryPromise,
} from '@/src/lib/effect-result';
import { db, knowledgeItems, type KnowledgeItem, type NewKnowledgeItem } from '@/src/db';
import { generateSummaryStub, generateTagsStub } from './stubs';
import { initializeReviewSchedule } from '../review';
import { logger } from '@/src/utils/logger';
import {
  createContentForProcessing,
  generateId,
  normalizeText,
} from './saveKnowledgeItem.transform';
import type {
  KnowledgeItemInput,
  SaveKnowledgeItemDeps,
  SaveResult,
} from './saveKnowledgeItem.types';
import { validateInput } from './saveKnowledgeItem.validation';

export type {
  HighlightInput,
  KnowledgeItemInput,
  LinkInput,
  NoteInput,
  SaveFailureResult,
  SaveKnowledgeItemDeps,
  SaveResult,
  SaveSuccessResult,
  ScreenshotInput,
  ShareInput,
} from './saveKnowledgeItem.types';

const defaultDeps: SaveKnowledgeItemDeps = {
  db,
  knowledgeItems,
  generateSummaryStub,
  generateTagsStub,
  initializeReviewSchedule,
  logger,
};

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
