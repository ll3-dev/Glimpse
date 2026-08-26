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
    expect(parsed.reasoningSummary).toBeNull();
  });
});

describe('reasoning summary contract (via parseChatMessageContent)', () => {
  test.each([
    ['english period', 'First check the config. Then retry.', 'First check the config.'],
    ['korean period', '첫 문장입니다. 두 번째 문장', '첫 문장입니다.'],
    ['question mark', '왜 실패했을까? 원인을 분석한다', '왜 실패했을까?'],
    ['exclamation mark', '다시 시도했다! 결과를 확인한다', '다시 시도했다!'],
    ['ideographic period', '確認します。次に進む', '確認します。'],
  ])('extracts the first sentence (%s)', (_label, reasoning, expected) => {
    const parsed = parseChatMessageContent(`<think>${reasoning}</think> 답`);
    expect(parsed.reasoningSummary).toBe(expected);
  });

  test.each(['1. ', '1) '])(
    'strips numbered prefix %r before summarizing',
    (prefix) => {
      const parsed = parseChatMessageContent(
        `<think>${prefix}첫 번째 후보를 검토한다. 그다음</think>`,
      );
      expect(parsed.reasoningSummary).toBe('첫 번째 후보를 검토한다.');
    },
  );

  test('truncates a first sentence longer than 90 chars to 87 chars + ellipsis', () => {
    const long = '추론에 대한 상세한 문장'.repeat(20);
    const parsed = parseChatMessageContent(`<think>${long}. 짧은 꼬리</think>`);
    expect(parsed.reasoningSummary).toBe(`${long.slice(0, 87)}...`);
    expect(parsed.reasoningSummary!.length).toBe(90);
  });

  test('short plain reasoning without terminators is summarized as-is', () => {
    const parsed = parseChatMessageContent('<think>짧은 생각</think>');
    expect(parsed.reasoningSummary).toBe('짧은 생각');
  });

  // ── 계약 차이 고정 (기존 정규식 대비 의도된 변경) ───────────────────────────

  test('[계약 차이] terminates at the first punctuation even without trailing whitespace', () => {
    // 이전: 종결부호 뒤 공백/EOS 가 없으면 문장 분할하지 않아 전체 반환 (예: '값은 3.14 입니다')
    // 이후: 90자 윈도우 안 첫 종결부호에서 무조건 절단
    const parsed = parseChatMessageContent('<think>값은 3.14 입니다</think>');
    expect(parsed.reasoningSummary).toBe('값은 3.');
  });

  test('[계약 차이] keeps only the first of consecutive punctuation marks', () => {
    // 이전: '?!' 처럼 연속된 종결부호를 모두 포함 ('정말인가?!')
    // 이후: 첫 종결부호 하나만 포함
    const parsed = parseChatMessageContent('<think>정말인가?! 바로 확인한다</think>');
    expect(parsed.reasoningSummary).toBe('정말인가?');
  });
});

describe('reasoning summary performance', () => {
  test('delimiter-free 60k input stays well under the frame budget', () => {
    // 공백/종결부호(. ! ? 。)가 전혀 없는 페이로드 — 스트리밍 중 닫히지 않은
    // 한글 추론 버퍼가 실제로 이 형태가 된다. 이전 구현은 여기서 O(n^2)
    // 백트래킹으로 수 초가 걸렸다(기준 측치: 60k = 2.4s).
    const chunk = '테스트청크'.repeat(12_000); // 60_000 chars
    expect(chunk.length).toBe(60_000);

    const startedAt = Date.now();
    const parsed = parseChatMessageContent(`<think>${chunk}</think>`);
    const elapsedMs = Date.now() - startedAt;

    // 요약 결과도 함께 고정: 첫 87자 + 말줄임 (기존은 문자열 "끝"의 90자를 반환했음)
    expect(parsed.isReasoningInProgress).toBe(false);
    expect(parsed.reasoningSummary).toBe(`${chunk.slice(0, 87)}...`);

    console.log(`summarizeReasoning on 60k delimiter-free input: ${elapsedMs}ms`);
    expect(elapsedMs).toBeLessThan(50);
  });
});
