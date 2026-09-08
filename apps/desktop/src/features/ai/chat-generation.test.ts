import { beforeEach, describe, expect, test, mock } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { itemEmbeddingText } from '@glimpse/hooks';
import {
  generateResponseWithKnowledge,
  RAG_LIBRARY_SAFETY_LIMIT,
  type ChatRouterDeps,
} from './chat-generation';
import {
  createMemoryEmbeddingIndexStore,
  hashItemText,
  type EmbeddingIndex,
} from './embedding-index';

/**
 * 채팅 지식 컨텍스트 주입 테스트.
 *
 * router는 주입 deps(ChatRouterDeps)로 대체한다. 예전에는 mock.module('./router')
 * 를 썼지만 bun의 모듈 mock은 프로세스 전역이라, 같은 bun test 프로세스에서
 * 뒤이어 실행되는 router.test.ts까지 오염시킬 수 있다(CI recovery 2026-09-06).
 * 주입 방식은 라우터 모듈 자체를 건드리지 않으므로 실행 순서와 무관하게 격리된다.
 *
 * knowledge-context는 순수 랭킹이므로 실제 코사인 계산을 돌린다 — 랭킹 수학을
 * 이중으로 흉내 내면 계약 파기를 테스트가 못 잡는다.
 *
 * embed-knowledge-batch도 mock.module로 대체하지 않는다(같은 전역 오염 이유).
 * embed는 모든 테스트에서 주입 deps로 대체되므로 실 전송 코드가 실행될 일이
 * 없다 — 모듈 mock이 없어도 격리는 유지된다.
 */

const chatResponseMock = mock(async () => '비스트림 응답');
const chatStreamMock = mock(async () => '');
const embedForRagMock = mock(async () => null);

const routerDeps: ChatRouterDeps = {
  generateChatResponse: chatResponseMock,
  generateChatStreamResponse: chatStreamMock,
};

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
    const note = item({ id: 'a', title: '러스트 소유권', summary: '소유권 개요' });
    embedForRagMock.mockImplementation(async (question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map([[itemTexts[0], [1, 0]]]),
    }));

    const result = await generateResponseWithKnowledge(
      [{ role: 'user', content: '소유권이 뭐야' }],
      undefined,
      { loadLibrary: async () => [note], embed: embedForRagMock },
      routerDeps,
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
    embedForRagMock.mockImplementation(async () => null);
    const history = [{ role: 'user', content: '질문' }];

    const result = await generateResponseWithKnowledge(history, undefined, {
      loadLibrary: async () => [item({ id: 'a', title: 'A' })],
      embed: embedForRagMock,
    }, routerDeps);

    expect(chatResponseMock).toHaveBeenCalledTimes(1);
    const received = chatResponseMock.mock.calls[0][0];
    expect(received[0].role).not.toBe('system');
    expect(received).toEqual(history);
    expect(result.references).toEqual([]);
  });

  test('라이브러리 로딩 실패(throw)도 원본 히스토리로 무음 폴백', async () => {
    const history = [{ role: 'user', content: '질문' }];

    const result = await generateResponseWithKnowledge(history, undefined, {
      loadLibrary: async () => {
        throw new Error('db boom');
      },
      embed: embedForRagMock,
    }, routerDeps);

    expect(embedForRagMock).not.toHaveBeenCalled();
    expect(chatResponseMock).toHaveBeenCalledTimes(1);
    expect(chatResponseMock.mock.calls[0][0]).toEqual(history);
    expect(result.references).toEqual([]);
  });

  test('빈 라이브러리면 임베딩 없이 라우터 1회 — 참조 없음', async () => {
    const result = await generateResponseWithKnowledge(
      [{ role: 'user', content: '질문' }],
      undefined,
      { loadLibrary: async () => [], embed: embedForRagMock },
      routerDeps,
    );

    expect(embedForRagMock).not.toHaveBeenCalled();
    expect(chatResponseMock).toHaveBeenCalledTimes(1);
    expect(result.references).toEqual([]);
  });

  test('사용자 메시지가 없으면 라우터를 그대로 호출 — 참조 없음', async () => {
    const history = [
      { role: 'assistant', content: '안녕하세요' },
      { role: 'assistant', content: '무엇을 도와드릴까요' },
    ];

    const result = await generateResponseWithKnowledge(history, undefined, {
      loadLibrary: async () => [item({ id: 'a', title: 'A' })],
      embed: embedForRagMock,
    }, routerDeps);

    expect(embedForRagMock).not.toHaveBeenCalled();
    expect(chatResponseMock).toHaveBeenCalledTimes(1);
    expect(chatResponseMock.mock.calls[0][0]).toEqual(history);
    expect(result.references).toEqual([]);
  });

  test('스트리밍도 보강 히스토리로 돌리고 라우터 빈 문자열엔 누적 텍스트를 돌려준다', async () => {
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
      routerDeps,
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
      routerDeps,
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

  test('저장소 없이는 캐시 없이 전체를 임베딩한다 — 100컷 철폐 확인', async () => {
    const many = Array.from({ length: 150 }, (_, index) =>
      item({ id: `item-${index}`, title: `노트 ${index}`, updatedAt: index }),
    );
    embedForRagMock.mockImplementation(async (_question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map(itemTexts.map((text) => [text, [1, 0]])),
    }));

    await generateResponseWithKnowledge([{ role: 'user', content: '질문' }], undefined, {
      loadLibrary: async () => many,
      embed: embedForRagMock,
    }, routerDeps);

    const texts = embedForRagMock.mock.calls[0][1];
    expect(texts).toHaveLength(150);
  });

  test('안전 상한을 넘으면 최신 항목을 남기고 가장 오래된 것부터 자른다', async () => {
    const many = Array.from({ length: RAG_LIBRARY_SAFETY_LIMIT + 5 }, (_, index) =>
      item({ id: `item-${index}`, title: `노트 ${index}`, updatedAt: index }),
    );
    embedForRagMock.mockImplementation(async (_question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map(itemTexts.map((text) => [text, [1, 0]])),
    }));

    await generateResponseWithKnowledge([{ role: 'user', content: '질문' }], undefined, {
      loadLibrary: async () => many,
      embed: embedForRagMock,
    }, routerDeps);

    const texts = embedForRagMock.mock.calls[0][1];
    expect(texts).toHaveLength(RAG_LIBRARY_SAFETY_LIMIT);
    // updatedAt이 가장 낮은 5개(가장 오래된 항목)가 잘렸다.
    expect(texts).not.toContain(itemEmbeddingText(item({ id: 'item-0', title: '노트 0' })));
    expect(texts).toContain(itemEmbeddingText(item({ id: 'item-1004', title: '노트 1004' })));
  });

  test('임베딩은 성공했으나 임계값 미달이면 원본 히스토리로 폴백 — 참조 없음', async () => {
    const history = [{ role: 'user', content: '전혀 다른 질문' }];
    // 직교 벡터 = 코사인 0 < 0.55 — 임베딩 파이프라인은 살아 있지만 관련 항목 없음.
    embedForRagMock.mockImplementation(async (_question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map(itemTexts.map((text) => [text, [0, 1]])),
    }));

    const result = await generateResponseWithKnowledge(history, undefined, {
      loadLibrary: async () => [item({ id: 'a', title: '무관한 노트' })],
      embed: embedForRagMock,
    }, routerDeps);

    expect(chatResponseMock).toHaveBeenCalledTimes(1);
    expect(chatResponseMock.mock.calls[0][0]).toEqual(history);
    expect(result.references).toEqual([]);
  });

  test('캐시 적중분은 재임베딩 없이 랭킹된다 — 질문 벡터만 배치에 실린다', async () => {
    const note = item({ id: 'a', title: '러스트 소유권', summary: '소유권 개요' });
    const index: EmbeddingIndex = {
      version: 1,
      modelId: 'emb-1',
      entries: {
        a: { h: hashItemText(itemEmbeddingText(note)), v: [1, 0], t: 1 },
      },
    };
    const store = createMemoryEmbeddingIndexStore(index);
    embedForRagMock.mockImplementation(async (_question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map(itemTexts.map((text) => [text, [1, 0]])),
      modelId: 'emb-1',
    }));

    const result = await generateResponseWithKnowledge(
      [{ role: 'user', content: '소유권이 뭐야' }],
      undefined,
      { loadLibrary: async () => [note], embed: embedForRagMock, indexStore: store },
      routerDeps,
    );

    // 임베더는 질문만 받는다 — 항목 벡터는 캐시에서 왔다.
    expect(embedForRagMock).toHaveBeenCalledWith('소유권이 뭐야', []);
    expect(result.references).toHaveLength(1);
    expect(result.references[0].item.id).toBe('a');
  });

  test('첫 호출은 전부 임베딩해 저장하고, 다음 호출은 새 항목만 임베딩한다', async () => {
    const first = item({ id: 'a', title: '노트 A', updatedAt: 1 });
    const second = item({ id: 'b', title: '노트 B', updatedAt: 2 });
    const store = createMemoryEmbeddingIndexStore(null);
    embedForRagMock.mockImplementation(async (_question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map(itemTexts.map((text) => [text, [1, 0]])),
      modelId: 'emb-1',
    }));

    await generateResponseWithKnowledge([{ role: 'user', content: '질문' }], undefined, {
      loadLibrary: async () => [first],
      embed: embedForRagMock,
      indexStore: store,
    }, routerDeps);
    expect(embedForRagMock.mock.calls[0][1]).toHaveLength(1);

    const afterFirst = store.load();
    expect(afterFirst?.modelId).toBe('emb-1');
    // 벡터는 소수 4자리로 반올림돼 저장된다.
    expect(afterFirst?.entries.a?.v).toEqual([1, 0]);

    // 라이브러리에 B가 추가됐다 — A는 캐시 적중, B만 배치에 실린다.
    await generateResponseWithKnowledge([{ role: 'user', content: '질문' }], undefined, {
      loadLibrary: async () => [first, second],
      embed: embedForRagMock,
      indexStore: store,
    }, routerDeps);

    expect(embedForRagMock.mock.calls[1][1]).toEqual([itemEmbeddingText(second)]);
  });

  test('텍스트가 바뀐 항목만 재임베딩하고, 삭제된 항목은 인덱스에서 프룬한다', async () => {
    const edited = item({ id: 'a', title: '노트 A (수정)', updatedAt: 3 });
    const removed = item({ id: 'gone', title: '노트 G', updatedAt: 2 });
    const kept = item({ id: 'b', title: '노트 B', updatedAt: 1 });
    const index: EmbeddingIndex = {
      version: 1,
      modelId: 'emb-1',
      entries: {
        a: { h: hashItemText(itemEmbeddingText(item({ id: 'a', title: '노트 A' }))), v: [1, 0], t: 1 },
        gone: { h: hashItemText(itemEmbeddingText(removed)), v: [1, 0], t: 1 },
        b: { h: hashItemText(itemEmbeddingText(kept)), v: [1, 0], t: 1 },
      },
    };
    const store = createMemoryEmbeddingIndexStore(index);
    embedForRagMock.mockImplementation(async (_question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map(itemTexts.map((text) => [text, [1, 0]])),
      modelId: 'emb-1',
    }));

    await generateResponseWithKnowledge([{ role: 'user', content: '질문' }], undefined, {
      // 'gone'은 라이브러리에서 삭제됐고, 'a'는 텍스트가 바뀌었다.
      loadLibrary: async () => [edited, kept],
      embed: embedForRagMock,
      indexStore: store,
    }, routerDeps);

    // 수정된 A만 배치에 실린다.
    expect(embedForRagMock.mock.calls[0][1]).toEqual([itemEmbeddingText(edited)]);

    const saved = store.load();
    expect(saved?.entries.a?.h).toBe(hashItemText(itemEmbeddingText(edited)));
    expect(saved?.entries.gone).toBeUndefined();
    expect(saved?.entries.b).toBeDefined();
  });

  test('임베딩 모델이 바뀌면 캐시를 폐기하고 전체를 다시 임베딩한다', async () => {
    const note = item({ id: 'a', title: '러스트 소유권', summary: '개요' });
    const index: EmbeddingIndex = {
      version: 1,
      modelId: 'old-model',
      entries: {
        a: { h: hashItemText(itemEmbeddingText(note)), v: [1, 0], t: 1 },
      },
    };
    const store = createMemoryEmbeddingIndexStore(index);
    embedForRagMock.mockImplementation(async (_question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map(itemTexts.map((text) => [text, [1, 0]])),
      modelId: 'new-model',
    }));

    const result = await generateResponseWithKnowledge(
      [{ role: 'user', content: '소유권이 뭐야' }],
      undefined,
      { loadLibrary: async () => [note], embed: embedForRagMock, indexStore: store },
      routerDeps,
    );

    // 1차 배치(캐시 적중으로 빈 목록) → 모델 불일치 감지 → 전체 재임베딩.
    expect(embedForRagMock).toHaveBeenCalledTimes(2);
    expect(embedForRagMock.mock.calls[1][1]).toEqual([itemEmbeddingText(note)]);
    expect(result.references).toHaveLength(1);
    expect(store.load()?.modelId).toBe('new-model');
  });

  test('캐시 저장이 실패해도 채팅은 정상 응답한다', async () => {
    const note = item({ id: 'a', title: '노트 A' });
    const store = createMemoryEmbeddingIndexStore(null);
    store.failNextSave();
    embedForRagMock.mockImplementation(async (_question, itemTexts) => ({
      queryVector: [1, 0],
      itemVectors: new Map(itemTexts.map((text) => [text, [1, 0]])),
      modelId: 'emb-1',
    }));

    const result = await generateResponseWithKnowledge(
      [{ role: 'user', content: '질문' }],
      undefined,
      { loadLibrary: async () => [note], embed: embedForRagMock, indexStore: store },
      routerDeps,
    );

    expect(result.references).toHaveLength(1);
    expect(result.text).toBe('비스트림 응답');
  });
});
