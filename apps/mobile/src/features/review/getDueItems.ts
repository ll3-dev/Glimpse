import {
  createGetDueItems,
  type GetDueItemsDeps,
  type GetDueItemsOptions,
  type GetDueItemsResult,
} from '@glimpse/features';
import { logger } from '@/src/utils/logger';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: GetDueItemsDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'getDueKnowledgeItems'>,
  logger,
};

export { createGetDueItems, type GetDueItemsOptions, type GetDueItemsResult };

export const getDueItems = createGetDueItems(defaultDeps);
