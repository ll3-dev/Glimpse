import {
  createUpdateConversationTitle,
  type UpdateConversationTitleDeps,
  type UpdateConversationTitleInput,
  type UpdateTitleFailureResult,
  type UpdateTitleResult,
  type UpdateTitleSuccessResult,
} from '@/src/features/core/application/chat';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

function getDefaultDeps(): UpdateConversationTitleDeps {
  return {
    coreClient: mobileCoreClient as Pick<MobileCoreClient, 'updateConversation'>,
  };
}
export type {
  UpdateConversationTitleDeps,
  UpdateConversationTitleInput,
  UpdateTitleFailureResult,
  UpdateTitleResult,
  UpdateTitleSuccessResult,
};
export { createUpdateConversationTitle };
export function updateConversationTitle(
  input: Parameters<ReturnType<typeof createUpdateConversationTitle>>[0]
) {
  return createUpdateConversationTitle(getDefaultDeps())(input);
}
