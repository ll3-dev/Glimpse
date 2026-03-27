import type {
  KnowledgeItem as NitroKnowledgeItem,
  Message as NitroMessage,
  Recommendation as NitroRecommendation,
  FeedbackEvent as NitroFeedbackEvent,
} from '../../../generate/CoreClient.nitro';
import type {
  KnowledgeItem,
  Conversation,
  Message,
  Recommendation,
  FeedbackEvent,
  KnowledgeItemType,
  KnowledgeItemLabelStatus,
  KnowledgeItemLabelSource,
  MessageRole,
  FeedbackActionType,
  RecommendationStatus,
} from '@glimpse/shared';

function stringPatch(value: string | undefined) {
  return {
    hasValue: value !== undefined,
    value: value ?? '',
  };
}

function nullableStringPatch(value: string | null | undefined) {
  return {
    hasValue: value !== undefined,
    isNull: value === null,
    value: value ?? '',
  };
}

function numberPatch(value: number | undefined) {
  return {
    hasValue: value !== undefined,
    value: value ?? 0,
  };
}

function nullableNumberPatch(value: number | null | undefined) {
  return {
    hasValue: value !== undefined,
    isNull: value === null,
    value: value ?? 0,
  };
}

function nullableStringArrayPatch(value: string[] | null | undefined) {
  return {
    hasValue: value !== undefined,
    isNull: value === null,
    value: value ?? [],
  };
}

function toKnowledgeItemPatch(patch: Partial<KnowledgeItem>) {
  return {
    type: stringPatch(patch.type),
    title: nullableStringPatch(patch.title),
    body: nullableStringPatch(patch.body),
    url: nullableStringPatch(patch.url),
    summary: nullableStringPatch(patch.summary),
    tags: nullableStringArrayPatch(patch.tags),
    labels: nullableStringArrayPatch(patch.labels),
    provisionalLabels: nullableStringArrayPatch(patch.provisionalLabels),
    labelStatus: nullableStringPatch(patch.labelStatus),
    labelSource: nullableStringPatch(patch.labelSource),
    labelVersion: nullableStringPatch(patch.labelVersion),
    labelScore: nullableNumberPatch(patch.labelScore),
    labelRequestedAt: nullableNumberPatch(patch.labelRequestedAt),
    labelCompletedAt: nullableNumberPatch(patch.labelCompletedAt),
    labelError: nullableStringPatch(patch.labelError),
    updatedAt: numberPatch(patch.updatedAt),
    stability: nullableNumberPatch(patch.stability),
    difficulty: nullableNumberPatch(patch.difficulty),
    lastReviewedAt: nullableNumberPatch(patch.lastReviewedAt),
    nextReviewAt: nullableNumberPatch(patch.nextReviewAt),
  };
}

function toNitroKnowledgeItem(item: KnowledgeItem): NitroKnowledgeItem {
  return {
    ...item,
    labels: item.labels ?? null,
    provisionalLabels: item.provisionalLabels ?? null,
    labelStatus: item.labelStatus ?? null,
    labelSource: item.labelSource ?? null,
    labelVersion: item.labelVersion ?? null,
    labelScore: item.labelScore ?? null,
    labelRequestedAt: item.labelRequestedAt ?? null,
    labelCompletedAt: item.labelCompletedAt ?? null,
    labelError: item.labelError ?? null,
  };
}

function fromNitroKnowledgeItem(item: NitroKnowledgeItem): KnowledgeItem {
  return {
    ...item,
    type: item.type as KnowledgeItemType,
    labelStatus: item.labelStatus as KnowledgeItemLabelStatus | null,
    labelSource: item.labelSource as KnowledgeItemLabelSource | null,
  };
}

function toNitroRecommendation(item: Recommendation): NitroRecommendation {
  return {
    id: item.id,
    itemAId: item.itemA_id,
    itemBId: item.itemB_id,
    reason: item.reason,
    status: item.status,
    createdAt: item.createdAt,
    respondedAt: item.respondedAt,
  };
}

function fromNitroRecommendation(item: NitroRecommendation): Recommendation {
  return {
    id: item.id,
    itemA_id: item.itemAId,
    itemB_id: item.itemBId,
    reason: item.reason,
    status: item.status as RecommendationStatus,
    createdAt: item.createdAt,
    respondedAt: item.respondedAt,
  };
}

function fromNitroMessage(item: NitroMessage): Message {
  return {
    ...item,
    role: item.role as MessageRole,
  };
}

function toNitroMessage(item: Message): NitroMessage {
  return item;
}

function fromNitroFeedbackEvent(item: NitroFeedbackEvent): FeedbackEvent {
  return {
    ...item,
    action: item.action as FeedbackActionType,
  };
}

function toNitroFeedbackEvent(item: FeedbackEvent): NitroFeedbackEvent {
  return item;
}

function toConversationPatch(patch: Partial<Conversation>) {
  return {
    title: nullableStringPatch(patch.title),
    icon: nullableStringPatch(patch.icon),
    contextItemId: nullableStringPatch(patch.contextItemId),
    updatedAt: numberPatch(patch.updatedAt),
    deletedAt: nullableNumberPatch(patch.deletedAt),
  };
}

function toMessagePatch(patch: Partial<Message>) {
  return {
    content: stringPatch(patch.content),
    updatedAt: nullableNumberPatch(patch.updatedAt),
    deletedAt: nullableNumberPatch(patch.deletedAt),
  };
}

export const nativeCoreBridgeHelpers = {
  stringPatch,
  nullableStringPatch,
  numberPatch,
  nullableNumberPatch,
  nullableStringArrayPatch,
  toKnowledgeItemPatch,
  toConversationPatch,
  toMessagePatch,
  toNitroKnowledgeItem,
  fromNitroKnowledgeItem,
  toNitroRecommendation,
  fromNitroRecommendation,
  toNitroMessage,
  fromNitroMessage,
  toNitroFeedbackEvent,
  fromNitroFeedbackEvent,
};
