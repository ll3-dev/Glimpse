/**
 * Chat message content parsing lives in @glimpse/features so mobile and
 * desktop share one <think>-tag implementation; this module keeps the
 * historical import path.
 */
export {
  parseChatMessageContent,
  type ParsedChatMessageContent,
} from '@glimpse/features';
