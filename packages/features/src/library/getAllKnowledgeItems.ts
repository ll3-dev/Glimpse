import type { KnowledgeItem } from '@glimpse/shared';

export interface GetItemsSuccessResult {
  success: true;
  items: KnowledgeItem[];
}

export interface GetItemsFailureResult {
  success: false;
  error: Error;
}

export type GetItemsResult = GetItemsSuccessResult | GetItemsFailureResult;

export interface GetAllKnowledgeItemsDeps {
  coreClient: {
    listKnowledgeItems: () => Promise<KnowledgeItem[]>;
  };
}

export function createGetAllKnowledgeItems(deps: GetAllKnowledgeItemsDeps) {
  return async (): Promise<GetItemsResult> => {
    try {
      const items = await deps.coreClient.listKnowledgeItems();
      return { success: true, items };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  };
}
