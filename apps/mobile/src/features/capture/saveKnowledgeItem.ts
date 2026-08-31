import { createSaveKnowledgeItem } from '@glimpse/features';
import { initializeReviewSchedule } from '../review/initializeReviewSchedule';
import { logger } from '@/src/utils/logger';
import { generateId, isIdCollisionError, MAX_ID_COLLISION_RETRIES } from '@/src/lib/id';
import type {
  SaveKnowledgeItemDeps,
} from './saveKnowledgeItem.types';
import { metadataRouter } from '@/src/features/ai/metadata';
import type { MetadataInput } from '@/src/features/ai/metadata/types';
import { mobileCoreClient } from '@/src/features/core';
import { Effect } from "effect";

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
    // Execute the Effect and extract the result
    const result = await Effect.runPromise(metadataRouter.generate(input));
    return result;
  },
  initializeReviewSchedule,
  logger,
  generateId,
  isIdCollisionError,
  maxIdCollisionRetries: MAX_ID_COLLISION_RETRIES,
};
export { createSaveKnowledgeItem };
export const saveKnowledgeItem = createSaveKnowledgeItem(defaultDeps);
