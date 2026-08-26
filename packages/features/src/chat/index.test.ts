import { describe, expect, mock, spyOn, test } from 'bun:test';
import type { Conversation, Message } from '@glimpse/shared';
import {
  createAddMessage,
  createCreateConversation,
  createDeleteConversation,
  parseChatMessageContent,
} from './index';

describe('chat application layer', () => {
  test('createConversation stamps ids and timestamps and persists via the client', async () => {
    const dateNow = spyOn(Date, 'now').mockReturnValue(1_000);
    const createConversation = mock(async (conversation: Conversation) => conversation);
    const generateId = mock(() => 'conv-1');

    const result = await createCreateConversation({
      coreClient: { createConversation },
      generateId,
    })({ title: 'New chat', icon: null, contextItemId: 'item-9' });

    expect(result).toEqual({
      success: true,
      conversation: {
        id: 'conv-1',
        title: 'New chat',
        icon: null,
        contextItemId: 'item-9',
        createdAt: 1_000,
        updatedAt: 1_000,
        deletedAt: null,
      },
    });
    dateNow.mockRestore();
  });

  test('createConversation maps client failures to CHAT_ERROR results', async () => {
    const result = await createCreateConversation({
      coreClient: {
        createConversation: async () => {
          throw new Error('db locked');
        },
      },
      generateId: () => 'conv-1',
    })({});

    expect(result).toEqual({
      success: false,
      error: { code: 'CHAT_ERROR', message: 'db locked' },
    });
  });

  test('addMessage builds the message record from input', async () => {
    const dateNow = spyOn(Date, 'now').mockReturnValue(2_000);
    const addMessage = mock(async (message: Message) => message);

    const result = await createAddMessage({
      coreClient: { addMessage },
      generateId: () => 'msg-1',
    })({ conversationId: 'conv-1', role: 'user', content: '안녕' });

    expect(result).toMatchObject({
      success: true,
      message: {
        id: 'msg-1',
        conversationId: 'conv-1',
        role: 'user',
        content: '안녕',
        createdAt: 2_000,
      },
    });
    dateNow.mockRestore();
  });

  test('deleteConversation propagates the deletion timestamp', async () => {
    const dateNow = spyOn(Date, 'now').mockReturnValue(3_000);
    const deleteConversation = mock(async () => undefined);

    const result = await createDeleteConversation({
      coreClient: { deleteConversation },
    })({ conversationId: 'conv-1' });

    expect(result).toEqual({ success: true });
    expect(deleteConversation).toHaveBeenCalledWith('conv-1', 3_000);
    dateNow.mockRestore();
  });
});

describe('parseChatMessageContent', () => {
  test('plain content has no reasoning', () => {
    const parsed = parseChatMessageContent('그냥 답변입니다');
    expect(parsed).toMatchObject({
      reasoning: null,
      answer: '그냥 답변입니다',
      isReasoningInProgress: false,
    });
  });

  test('completed think block splits reasoning and answer', () => {
    const parsed = parseChatMessageContent(
      '앞부분 <think>사용자가 질문함. 관련 항목을 찾아야 한다.</think> 뒷부분 답변',
    );
    expect(parsed.isReasoningInProgress).toBe(false);
    expect(parsed.reasoning).toBe('사용자가 질문함. 관련 항목을 찾아야 한다.');
    expect(parsed.answer).toContain('앞부분');
    expect(parsed.answer).toContain('뒷부분 답변');
    expect(parsed.reasoningSummary).toBe('사용자가 질문함.');
  });

  test('unclosed think block marks reasoning in progress', () => {
    const parsed = parseChatMessageContent('답변 시작 <think>아직 생각 중');
    expect(parsed.isReasoningInProgress).toBe(true);
    expect(parsed.reasoning).toBe('아직 생각 중');
    expect(parsed.answer).toBe('답변 시작');
  });

  test('long reasoning is summarized to one short sentence', () => {
    const long = '첫 문장은 매우 길다'.repeat(20) + '. 두 번째 문장';
    const parsed = parseChatMessageContent(`<think>${long}</think> 답`);
    expect(parsed.reasoningSummary).not.toBeNull();
    expect(parsed.reasoningSummary!.length).toBeLessThanOrEqual(90);
  });

  test('empty think block yields null reasoning', () => {
    const parsed = parseChatMessageContent('<think>   </think> 답변만 있음');
    expect(parsed.reasoning).toBeNull();
    expect(parsed.answer).toContain('답변만 있음');
  });
});
