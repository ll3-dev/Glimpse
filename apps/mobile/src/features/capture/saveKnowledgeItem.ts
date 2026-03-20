import {
  appError,
  isFailure,
  runEffectResult,
} from '@/src/lib/effect-result';
import { Effect } from 'effect';
import { mobileCoreClient } from '@/src/features/core';
import type { KnowledgeItem, NewKnowledgeItem } from '@glimpse/shared';
import { initializeReviewSchedule } from '../review';
import { logger } from '@/src/utils/logger';
import { isIdCollisionError, MAX_ID_COLLISION_RETRIES } from '@/src/lib/id';
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
import { metadataRouter } from '@/src/features/ai/metadata';

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
  GenerateMetadata,
} from './saveKnowledgeItem.types';

const defaultDeps: SaveKnowledgeItemDeps = {
  coreClient: mobileCoreClient,
  generateMetadata: (input) => metadataRouter.generate(input),
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

    const now = Date.now();
    const contentForProcessing = createContentForProcessing(input);

    // Generate metadata via router (falls back to stub on failure)
    const metadataResult = await deps.generateMetadata({
      content: contentForProcessing,
      title: input.title,
      type: input.type,
    });

    // Use generated metadata, or empty defaults on failure (graceful degradation)
    const summary = metadataResult.success ? metadataResult.data.summary : '';
    const tags = metadataResult.success ? metadataResult.data.tags : [];

    for (let attempt = 0; attempt <= MAX_ID_COLLISION_RETRIES; attempt++) {
      const id = generateId();
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

      const insertResult = await runEffectResult(
        Effect.tryPromise({
          try: () => deps.coreClient.saveKnowledgeItem(newKnowledgeItem as KnowledgeItem),
          catch: (error) => appError('DATABASE_ERROR', 'Failed to save knowledge item', error),
        })
      );

      if (insertResult.success) {
        return { success: true, data: insertResult.data };
      }
      if (!isFailure(insertResult)) {
        continue;
      }

      const isCollision = isIdCollisionError(insertResult.error.details);
      const isFinalAttempt = attempt === MAX_ID_COLLISION_RETRIES;

      if (isCollision && !isFinalAttempt) {
        continue;
      }

      if (isCollision && isFinalAttempt) {
        const exhaustedError = appError(
          'DATABASE_ERROR',
          'Failed to save knowledge item after ID collision retries'
        );
        deps.logger.error('saveKnowledgeItem failed', exhaustedError, { inputType: input.type });
        return { success: false, error: exhaustedError };
      }

      if (!isCollision) {
        deps.logger.error('saveKnowledgeItem failed', insertResult.error, { inputType: input.type });
        return insertResult;
      }
    }

    const unexpectedError = appError('UNKNOWN_ERROR', 'Unexpected save flow');
    deps.logger.error('saveKnowledgeItem failed', unexpectedError, { inputType: input.type });
    return { success: false, error: unexpectedError };
  };
}

export const saveKnowledgeItem = createSaveKnowledgeItem();
