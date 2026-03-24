import {
  appError,
  isFailure,
  runEffectResult,
} from '../../foundation/effect-result';
import { Effect } from 'effect';
import type { KnowledgeItem, NewKnowledgeItem } from '@glimpse/shared';
import {
  createContentForProcessing,
  normalizeText,
} from './saveKnowledgeItem.transform';
import type {
  KnowledgeItemInput,
  SaveKnowledgeItemDeps,
  SaveResult,
} from './saveKnowledgeItem.types';
import { validateInput } from './saveKnowledgeItem.validation';
export function createSaveKnowledgeItem(deps: SaveKnowledgeItemDeps) {
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

    for (let attempt = 0; attempt <= deps.maxIdCollisionRetries; attempt++) {
      const id = deps.generateId();
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
        return { success: true as const, data: insertResult.data as KnowledgeItem };
      }
      if (!isFailure(insertResult)) {
        continue;
      }

      const isCollision = deps.isIdCollisionError(insertResult.error.details);
      const isFinalAttempt = attempt === deps.maxIdCollisionRetries;

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
