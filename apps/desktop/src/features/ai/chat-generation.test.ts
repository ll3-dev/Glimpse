import { beforeEach, describe, expect, test, mock } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { itemEmbeddingText } from '@glimpse/hooks';

/**
 * 채팅 지식 컨텍스트 주입 테스트.
 *
 * router는 mock.module로 대체하고, knowledge-context는 순수 랭킹이므로 실제
 * 코사인 계산을 돌린다 — 랭킹 수학을 이중으로 흉내 내면 계약 파기를 테스트가
 * 못 잡는다.
 *
 * embed-knowledge-batch는 mock으로 대체하지 않는다. bun의 mock.module은 프로세스
 * 전역이라 같은 디렉터리 테스트를 한 번에 돌리면 embed-knowledge-batch.test.ts까지
 * 오염시킨다(실측). embed는 모든 테스트에서 주입 deps로 대체되므로 실 전송 코드가
 * 실행될 일이 없다 — 모듈 mock이 없어도 격리는 유지된다.
 */

const chatResponseMock = mock(async () => '비스트림 응답');
const chatStreamMock = mock(async () => '');
const embedForRagMock = mock(async () => null);

mock.module('./router', () => ({
  generateChatResponse: chatResponseMock,
  generateChatStreamResponse: chatStreamMock,
}));

async function loadModule() {
  return await import('./chat-generation');
}

function item(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  const now = Date.now();
  return {
    id: 'i',
    type: 'note',
    title: null,
    body: null,
    url: null,
    summary: null,
    tags: null,
    labels: null,
    provisionalLabels: null,
    labelStatus: 'pending',
    labelSource: null,
    labelVersion: null,
    labelScore: null,
    labelRequestedAt: null,
    labelCompletedAt: null,
    labelError: null,
    createdAt: now,
    updatedAt: now,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  chatResponseMock.mockImplementation(async () => '비스트림 응답');
  chatStreamMock.mockImplementation(async (_messages, callbacks) => {
    callbacks.onDone('');
    return '';
  });
  embedForRagMock.mockImplementation(async () => null);
  chatResponseMock.mockClear();
  chatStreamMock.mockClear();
  embedForRagMock.mockClear();
});

describe('generateResponseWithKnowledge', () => {
  test('관련 지식이 있으면 system 컨텍스트를 히스토리 앞에 붙인다', async () => {
    const { generateResponseWithKnowledge } = await loadModule();
    const note = item({ id: 'a', title: '러스트 소유권', summary: '소유권 개요' });
    embedForRagMock.mockImplementation(async (question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map([[itemTexts[0], [1, 0]]]),
    }));

    const result = await generateResponseWithKnowledge(
      [{ role: 'user', content: '소유권이 뭐야' }],
      undefined,
      { loadLibrary: async () => [note], embed: embedForRagMock },
    );

    // 라우터는 system이 맨 앞인 보강 히스토리를 받는다.
    expect(chatResponseMock).toHaveBeenCalledTimes(1);
    const history = chatResponseMock.mock.calls[0][0];
    expect(history[0].role).toBe('system');
    expect(history[0].content).toContain('러스트 소유권');
    expect(history[1]).toEqual({ role: 'user', content: '소유권이 뭐야' });

    // 질문과 항목 텍스트가 임베더로 간다.
    expect(embedForRagMock).toHaveBeenCalledWith('소유권이 뭐야', [
      itemEmbeddingText(note),
    ]);

    // 실제 코사인(동일 벡터 = 1.0)이 임계값을 넘은 항목을 참조로 돌려준다.
    expect(result.references).toHaveLength(1);
    expect(result.references[0].item.id).toBe('a');
    expect(result.references[0].score).toBeGreaterThanOrEqual(0.55);
    expect(result.text).toBe('비스트림 응답');
  });

  test('임베딩 실패(null)면 원본 히스토리로 폴백 — 참조 없음', async () => {
    const { generateResponseWithKnowledge } = await loadModule();
    embedForRagMock.mockImplementation(async () => null);
    const history = [{ role: 'user', content: '질문' }];

    const result = await generateResponseWithKnowledge(history, undefined, {
      loadLibrary: async () => [item({ id: 'a', title: 'A' })],
      embed: embedForRagMock,
    });

    expect(chatResponseMock).toHaveBeenCalledTimes(1);
    const received = chatResponseMock.mock.calls[0][0];
    expect(received[0].role).not.toBe('system');
    expect(received).toEqual(history);
    expect(result.references).toEqual([]);
  });

  test('라이브러리 로딩 실패(throw)도 원본 히스토리로 무음 폴백', async () => {
    const { generateResponseWithKnowledge } = await loadModule();
    const history = [{ role: 'user', content: '질문' }];

    const result = await generateResponseWithKnowledge(history, undefined, {
      loadLibrary: async () => {
        throw new Error('db boom');
      },
      embed: embedForRagMock,
    });

    expect(embedForRagMock).not.toHaveBeenCalled();
    expect(chatResponseMock).toHaveBeenCalledTimes(1);
    expect(chatResponseMock.mock.calls[0][0]).toEqual(history);
    expect(result.references).toEqual([]);
  });

  test('빈 라이브러리면 임베딩 없이 라우터 1회 — 참조 없음', async () => {
    const { generateResponseWithKnowledge } = await loadModule();

    const result = await generateResponseWithKnowledge(
      [{ role: 'user', content: '질문' }],
      undefined,
      { loadLibrary: async () => [], embed: embedForRagMock },
    );

    expect(embedForRagMock).not.toHaveBeenCalled();
    expect(chatResponseMock).toHaveBeenCalledTimes(1);
    expect(result.references).toEqual([]);
  });

  test('사용자 메시지가 없으면 라우터를 그대로 호출 — 참조 없음', async () => {
    const { generateResponseWithKnowledge } = await loadModule();
    const history = [
      { role: 'assistant', content: '안녕하세요' },
      { role: 'assistant', content: '무엇을 도와드릴까요' },
    ];

    const result = await generateResponseWithKnowledge(history, undefined, {
      loadLibrary: async () => [item({ id: 'a', title: 'A' })],
      embed: embedForRagMock,
    });

    expect(embedForRagMock).not.toHaveBeenCalled();
    expect(chatResponseMock).toHaveBeenCalledTimes(1);
    expect(chatResponseMock.mock.calls[0][0]).toEqual(history);
    expect(result.references).toEqual([]);
  });

  test('스트리밍도 보강 히스토리로 돌리고 라우터 빈 문자열엔 누적 텍스트를 돌려준다', async () => {
    const { generateResponseWithKnowledge } = await loadModule();
    const note = item({ id: 'a', title: '러스트 소유권', summary: '개요' });
    chatStreamMock.mockImplementation(async (_messages, callbacks) => {
      callbacks.onToken('지식 ');
      callbacks.onToken('기반 답');
      return '';
    });
    embedForRagMock.mockImplementation(async (_question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map([[itemTexts[0], [1, 0]]]),
    }));
    const tokens: string[] = [];

    const result = await generateResponseWithKnowledge(
      [{ role: 'user', content: '소유권이 뭐야' }],
      { onToken: (token) => tokens.push(token) },
      { loadLibrary: async () => [note], embed: embedForRagMock },
    );

    expect(chatStreamMock).toHaveBeenCalledTimes(1);
    expect(chatResponseMock).not.toHaveBeenCalled();
    const streamedHistory = chatStreamMock.mock.calls[0][0];
    expect(streamedHistory[0].role).toBe('system');
    expect(streamedHistory[0].content).toContain('러스트 소유권');
    expect(tokens).toEqual(['지식 ', '기반 답']);
    expect(result.text).toBe('지식 기반 답');
    expect(result.references).toHaveLength(1);
  });

  test('중복 텍스트 항목은 한 번만 임베딩되고 벡터가 양쪽 id에 매핑된다', async () => {
    const { generateResponseWithKnowledge } = await loadModule();
    const first = item({ id: 'a', title: '같은 노트', summary: '동일 본문' });
    const second = item({ id: 'b', title: '같은 노트', summary: '동일 본문' });
    const sharedText = itemEmbeddingText(first);
    embedForRagMock.mockImplementation(async () => ({
      queryVector: [1, 0],
      itemVectors: new Map([[sharedText, [1, 0]]]),
    }));

    const result = await generateResponseWithKnowledge(
      [{ role: 'user', content: '노트 찾아줘' }],
      undefined,
      { loadLibrary: async () => [first, second], embed: embedForRagMock },
    );

    // 임베더는 고유 텍스트만 받는다.
    const texts = embedForRagMock.mock.calls[0][1];
    expect(texts).toEqual([sharedText]);
    expect(new Set(texts).size).toBe(texts.length);

    // 같은 벡터를 공유한 양쪽 항목이 모두 참조에 오른다.
    const referencedIds = result.references.map((entry) => entry.item.id).sort();
    expect(referencedIds).toEqual(['a', 'b']);
    expect(result.references.every((entry) => entry.score >= 0.55)).toBe(true);
  });

  test('라이브러리는 상한 100개로 잘라 임베딩한다 — 재임베딩 비용 경계', async () => {
    const { generateResponseWithKnowledge, RAG_LIBRARY_LIMIT } = await loadModule();
    const many = Array.from({ length: RAG_LIBRARY_LIMIT + 5 }, (_, index) =>
      item({ id: `item-${index}`, title: `노트 ${index}` }),
    );
    embedForRagMock.mockImplementation(async (_question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map(itemTexts.map((text) => [text, [1, 0]])),
    }));

    await generateResponseWithKnowledge([{ role: 'user', content: '질문' }], undefined, {
      loadLibrary: async () => many,
      embed: embedForRagMock,
    });

    const texts = embedForRagMock.mock.calls[0][1];
    expect(many.length).toBe(RAG_LIBRARY_LIMIT + 5);
    expect(texts).toHaveLength(RAG_LIBRARY_LIMIT);
  });
});
