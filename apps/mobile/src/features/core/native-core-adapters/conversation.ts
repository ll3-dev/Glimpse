import type { Conversation } from '@glimpse/shared';

import { nativeCoreBridgeHelpers } from '../native-core-bridge';
import type { BridgeCoreClient } from '../types';

import type { NativeAdapterDeps } from './common';

const { toConversationPatch } = nativeCoreBridgeHelpers;

export function createConversationAdapter(
  deps: NativeAdapterDeps,
): Pick<
  BridgeCoreClient,
  'createConversation' | 'listConversations' | 'updateConversation' | 'deleteConversation'
> {
  const { fallbackClient, runCoreAsync } = deps;

  return {
    async createConversation(conversation: Conversation): Promise<Conversation> {
      return runCoreAsync(
        (client) => client.createConversation(conversation),
        () => fallbackClient.createConversation(conversation),
      );
    },

    async listConversations(): Promise<Conversation[]> {
      return runCoreAsync(
        (client) => client.listConversations(),
        () => fallbackClient.listConversations(),
      );
    },

    async updateConversation(
      conversationId: string,
      patch: Partial<Conversation>,
    ): Promise<Conversation> {
      return runCoreAsync(
        (client) => client.updateConversation(conversationId, toConversationPatch(patch)),
        () => fallbackClient.updateConversation(conversationId, patch),
      );
    },

    async deleteConversation(
      conversationId: string,
      deletedAt: number,
    ): Promise<void> {
      await runCoreAsync(
        (client) => client.deleteConversation(conversationId, deletedAt),
        () => fallbackClient.deleteConversation(conversationId, deletedAt),
      );
    },
  };
}
