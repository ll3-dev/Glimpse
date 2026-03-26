import { createSaveKnowledgeItem } from '@/src/features/core/application/capture';
import { initializeReviewSchedule } from '../review';
import { logger } from '@/src/utils/logger';
import { generateId, isIdCollisionError, MAX_ID_COLLISION_RETRIES } from '@/src/lib/id';
import type {
  SaveKnowledgeItemDeps,
} from './saveKnowledgeItem.types';
import { metadataRouter } from '@/src/features/ai/metadata';
import type { MetadataInput } from '@/src/features/ai/metadata/types';
import { mobileCoreClient } from '@/src/features/core';

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
  generateMetadata: async (input: MetadataInput) => {
    const result = await metadataRouter.generate(input);
    if (result.success === false) {
      throw new Error(result.error.message);
    }
    return result.data;
  },
  initializeReviewSchedule,
  logger,
  generateId,
  isIdCollisionError,
  maxIdCollisionRetries: MAX_ID_COLLISION_RETRIES,
};
export { createSaveKnowledgeItem };
export const saveKnowledgeItem = createSaveKnowledgeItem(defaultDeps);
