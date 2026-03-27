import type { Message } from '@glimpse/shared';

import { nativeCoreBridgeHelpers } from '../native-core-bridge';
import type { BridgeCoreClient } from '../types';

import type { NativeAdapterDeps } from './common';

const { fromNitroMessage, toMessagePatch, toNitroMessage } = nativeCoreBridgeHelpers;

export function createMessageAdapter(
  deps: NativeAdapterDeps,
): Pick<
  BridgeCoreClient,
  'listConversationMessages' | 'addMessage' | 'updateMessage' | 'deleteMessage'
> {
  const { fallbackClient, runCoreAsync } = deps;

  return {
    async listConversationMessages(conversationId: string): Promise<Message[]> {
      return runCoreAsync(
        async (client) =>
          (await client.listConversationMessages(conversationId)).map(fromNitroMessage),
        () => fallbackClient.listConversationMessages(conversationId),
      );
    },

    async addMessage(message: Message): Promise<Message> {
      return runCoreAsync(
        async (client) => fromNitroMessage(await client.addMessage(toNitroMessage(message))),
        () => fallbackClient.addMessage(message),
      );
    },

    async updateMessage(
      messageId: string,
      patch: Partial<Message>,
    ): Promise<Message> {
      return runCoreAsync(
        async (client) =>
          fromNitroMessage(await client.updateMessage(messageId, toMessagePatch(patch))),
        () => fallbackClient.updateMessage(messageId, patch),
      );
    },

    async deleteMessage(messageId: string, deletedAt: number): Promise<void> {
      await runCoreAsync(
        (client) => client.deleteMessage(messageId, deletedAt),
        () => fallbackClient.deleteMessage(messageId, deletedAt),
      );
    },
  };
}
