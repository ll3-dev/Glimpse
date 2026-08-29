import { describe, expect, test } from 'bun:test';
import { buildKnowledgeContext } from './knowledge-context';
import type { KnowledgeItem } from '@glimpse/shared';

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

describe('buildKnowledgeContext', () => {
  test('임계값 미만 유사도는 컨텍스트에서 제외된다', () => {
    const items = [item({ id: 'a', title: 'A' })];
    const result = buildKnowledgeContext(items, {
      queryEmbedding: [1, 0],
      itemEmbeddings: new Map([['a', [0, 1]]]), // 직교 = 유사도 0
    });
    expect(result.entries).toHaveLength(0);
    expect(result.contextMessages).toHaveLength(0);
  });

  test('상위 K개만 유사도 내림차순으로 선별된다', () => {
    const items = ['a', 'b', 'c'].map((id) => item({ id }));
    const embeddings = new Map([
      ['a', [1, 0]],
      ['b', [0.9, 0.1]],
      ['c', [0.1, 0.9]],
    ]);
    const result = buildKnowledgeContext(items, {
      queryEmbedding: [1, 0],
      itemEmbeddings: embeddings,
      maxEntries: 2,
    });
    expect(result.entries.map((e) => e.item.id)).toEqual(['a', 'b']);
  });

  test('컨텍스트 메시지는 role system 단일 발신이다', () => {
    const items = [item({ id: 'a', title: '러스트 소유권', summary: '소유권 개요' })];
    const result = buildKnowledgeContext(items, {
      queryEmbedding: [1, 0],
      itemEmbeddings: new Map([['a', [1, 0]]]),
    });
    expect(result.contextMessages).toHaveLength(1);
    expect(result.contextMessages[0].role).toBe('system');
    expect(result.contextMessages[0].content).toContain('러스트 소유권');
    expect(result.entries[0].item.id).toBe('a');
  });

  test('아이템 벡터가 맵에 없으면 제외된다 — 미임베딩 분기', () => {
    const result = buildKnowledgeContext([item({ id: 'a', title: 'A' })], {
      queryEmbedding: [1, 0], // 비지 않음 — 조기 반환 대신 필터 분기를 실행
      itemEmbeddings: new Map(), // 'a' 없음
    });
    expect(result.entries).toHaveLength(0);
    expect(result.contextMessages).toHaveLength(0);
  });

  test('임베딩된 아이템만 선별되고 나머지는 제외된다', () => {
    const items = [item({ id: 'a', title: '임베딩됨' }), item({ id: 'b', title: '벡터 없음' })];
    const result = buildKnowledgeContext(items, {
      queryEmbedding: [1, 0],
      itemEmbeddings: new Map([['a', [1, 0]]]),
    });
    expect(result.entries.map((e) => e.item.id)).toEqual(['a']);
    expect(result.contextMessages).toHaveLength(1);
    expect(result.contextMessages[0].content).not.toContain('벡터 없음');
  });
});
