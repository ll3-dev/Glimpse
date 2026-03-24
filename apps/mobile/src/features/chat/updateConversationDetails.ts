import {
  createUpdateConversationDetails,
  type UpdateConversationDetailsDeps,
  type UpdateConversationDetailsFailureResult,
  type UpdateConversationDetailsInput,
  type UpdateConversationDetailsResult,
  type UpdateConversationDetailsSuccessResult,
} from '@glimpse/core/application/chat';
import { mobileCoreClient, type MobileCoreClient } from '@/src/features/core';

const defaultDeps: UpdateConversationDetailsDeps = {
  coreClient: mobileCoreClient as Pick<MobileCoreClient, 'updateConversation'>,
};
export type {
  UpdateConversationDetailsDeps,
  UpdateConversationDetailsFailureResult,
  UpdateConversationDetailsInput,
  UpdateConversationDetailsResult,
  UpdateConversationDetailsSuccessResult,
};
export { createUpdateConversationDetails };
export const updateConversationDetails = createUpdateConversationDetails(defaultDeps);
