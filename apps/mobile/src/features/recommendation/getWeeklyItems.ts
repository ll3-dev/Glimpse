import {
  createGetWeeklyItems,
  type GetWeeklyItemsDeps,
  type WeeklyItemsFailureResult,
  type WeeklyItemsResult,
  type WeeklyItemsSuccessResult,
} from "@/src/features/core/application/recommendation";
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

function getDefaultDeps(): GetWeeklyItemsDeps {
  return {
    coreClient: mobileCoreClient as Pick<MobileCoreClient, 'listWeeklyKnowledgeItems'>,
  };
}

export type {
  GetWeeklyItemsDeps,
  WeeklyItemsFailureResult,
  WeeklyItemsResult,
  WeeklyItemsSuccessResult,
};
export { createGetWeeklyItems };
export function getWeeklyItems(since?: number) {
  return createGetWeeklyItems(getDefaultDeps())(since);
}
