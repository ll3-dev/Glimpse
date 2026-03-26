import {
  createUpdateConversationTitle,
  type UpdateConversationTitleDeps,
  type UpdateConversationTitleInput,
  type UpdateTitleFailureResult,
  type UpdateTitleResult,
  type UpdateTitleSuccessResult,
} from '@/src/features/core/application/chat';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: UpdateConversationTitleDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'updateConversation'>,
};
export type {
  UpdateConversationTitleDeps,
  UpdateConversationTitleInput,
  UpdateTitleFailureResult,
  UpdateTitleResult,
  UpdateTitleSuccessResult,
};
export { createUpdateConversationTitle };
export const updateConversationTitle = createUpdateConversationTitle(defaultDeps);
