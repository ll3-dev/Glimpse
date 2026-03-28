import type { GetDueKnowledgeItemsInput, KnowledgeItem } from '@glimpse/shared';

export interface KnowledgeQueryCore {
  listKnowledgeItems: () => Promise<KnowledgeItem[]>;
}

export async function listKnowledgeItemsByIdsWithCore(
  coreClient: KnowledgeQueryCore,
  itemIds: string[]
): Promise<KnowledgeItem[]> {
  const all = await coreClient.listKnowledgeItems();
  const idSet = new Set(itemIds);
  return all.filter((item) => idSet.has(item.id));
}

export async function listWeeklyKnowledgeItemsWithCore(
  coreClient: KnowledgeQueryCore,
  since: number
): Promise<KnowledgeItem[]> {
  const all = await coreClient.listKnowledgeItems();
  return all.filter((item) => item.createdAt >= since);
}

export async function listPendingKnowledgeItemsForLabelingWithCore(
  coreClient: KnowledgeQueryCore,
  limit: number
): Promise<KnowledgeItem[]> {
  const all = await coreClient.listKnowledgeItems();
  return all.filter((item) => item.labelStatus === 'pending').slice(0, limit);
}

export async function getDueKnowledgeItemsWithCore(
  coreClient: KnowledgeQueryCore,
  input: GetDueKnowledgeItemsInput
): Promise<KnowledgeItem[]> {
  const all = await coreClient.listKnowledgeItems();
  const due = all.filter((item) => {
    if (!item.nextReviewAt) {
      return true;
    }
    return item.nextReviewAt <= input.now;
  });
  return input.limit === undefined ? due : due.slice(0, input.limit);
}
