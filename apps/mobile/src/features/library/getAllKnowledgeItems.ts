import {
  createGetAllKnowledgeItems,
  type GetAllKnowledgeItemsDeps,
  type GetItemsFailureResult,
  type GetItemsResult,
  type GetItemsSuccessResult,
} from '@glimpse/core/application/library';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: GetAllKnowledgeItemsDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'listKnowledgeItems'>,
};
export type {
  GetAllKnowledgeItemsDeps,
  GetItemsFailureResult,
  GetItemsResult,
  GetItemsSuccessResult,
};
export { createGetAllKnowledgeItems };
export const getAllKnowledgeItems = createGetAllKnowledgeItems(defaultDeps);
