import {
  createGetWeeklyItems,
  type GetWeeklyItemsDeps,
  type WeeklyItemsFailureResult,
  type WeeklyItemsResult,
  type WeeklyItemsSuccessResult,
} from "@/src/features/core/application/recommendation";
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: GetWeeklyItemsDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'listWeeklyKnowledgeItems'>,
};
export type {
  GetWeeklyItemsDeps,
  WeeklyItemsFailureResult,
  WeeklyItemsResult,
  WeeklyItemsSuccessResult,
};
export { createGetWeeklyItems };
export const getWeeklyItems = createGetWeeklyItems(defaultDeps);
