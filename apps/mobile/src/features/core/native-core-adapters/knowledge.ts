import type { KnowledgeItem } from '@glimpse/shared';

import { nativeCoreBridgeHelpers } from '../native-core-bridge';
import type { BridgeCoreClient } from '../types';

import type { NativeAdapterDeps } from './common';

const { fromNitroKnowledgeItem, toKnowledgeItemPatch, toNitroKnowledgeItem } =
  nativeCoreBridgeHelpers;

export function createKnowledgeAdapter(
  deps: NativeAdapterDeps,
): Pick<
  BridgeCoreClient,
  'saveKnowledgeItem' | 'listKnowledgeItems' | 'getKnowledgeItemById' | 'updateKnowledgeItem'
> {
  const { fallbackClient, runCoreAsync } = deps;

  return {
    async saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem> {
      return runCoreAsync(
        async (client) =>
          fromNitroKnowledgeItem(await client.saveKnowledgeItem(toNitroKnowledgeItem(item))),
        () => fallbackClient.saveKnowledgeItem(item),
      );
    },

    async listKnowledgeItems(): Promise<KnowledgeItem[]> {
      return runCoreAsync(
        async (client) => (await client.listKnowledgeItems()).map(fromNitroKnowledgeItem),
        () => fallbackClient.listKnowledgeItems(),
      );
    },

    async getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null> {
      return runCoreAsync(
        async (client) => {
          const item = await client.getKnowledgeItemById(itemId);
          return item ? fromNitroKnowledgeItem(item) : null;
        },
        () => fallbackClient.getKnowledgeItemById(itemId),
      );
    },

    async updateKnowledgeItem(
      itemId: string,
      patch: Partial<KnowledgeItem>,
    ): Promise<KnowledgeItem> {
      return runCoreAsync(
        async (client) =>
          fromNitroKnowledgeItem(
            await client.updateKnowledgeItem(itemId, toKnowledgeItemPatch(patch)),
          ),
        () => fallbackClient.updateKnowledgeItem(itemId, patch),
      );
    },
  };
}
