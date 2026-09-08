import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import type { SemanticEmbedDeps } from '@glimpse/hooks';
import {
  buildChatKnowledgeContext,
  formatKnowledgeContext,
  selectRecentChatMessages,
  selectRelevantKnowledge,
  selectRelevantKnowledgeWithEmbedding,
} from './chat-context';

function item(id: string, title: string, body: string, tags: string[] = []): KnowledgeItem {
  return {
    id,
    type: 'note',
    title,
    body,
    tags,
    url: null,
    summary: null,
    createdAt: 1,
    updatedAt: 1,
    lastReviewedAt: null,
    nextReviewAt: null,
    stability: null,
    difficulty: null,
  };
}

describe('chat knowledge context', () => {
  test('ranks title and tag matches ahead of body-only matches', () => {
    const result = selectRelevantKnowledge('Rust 성능', [
      item('body', '메모', 'Rust 성능을 측정했다'),
      item('title', 'Rust 성능 분석', '결과'),
      item('tag', '벤치마크', '결과', ['rust', '성능']),
    ]);
    expect(result.map((entry) => entry.id)).toEqual(['title', 'tag', 'body']);
  });

  test('keeps the explicit context first and excludes it from retrieval', async () => {
    const primary = item('primary', 'Rust', '기본 문서');
    const result = await buildChatKnowledgeContext('Rust', primary, [
      primary,
      item('related', 'Rust 메모', '관련 문서'),
    ]);
    expect(result.map((entry) => entry.id)).toEqual(['primary', 'related']);
  });

  test('임베더가 주입되면 코사인 유사도로 재순위한다', async () => {
    // 휴리스틱 1순위는 'title'이지만, 임베더는 'body'가 질문과 가장 가깝다고 답한다.
    const embedDeps: SemanticEmbedDeps = {
      async resolveEmbeddingTarget() {
        return { runtimeId: 'on-device-llama-rn', modelId: 'nomic' };
      },
      async embedBatch(requests) {
        return requests.map((request) => {
          const input = String((request as { input: string }).input);
          if (input.includes('쿼리')) return { vector: [1, 0] };
          // 'body' 항목만 질문과 같은 방향 — 나머지는 직교.
          return { vector: input === '메모\nRust 성능을 측정했다' ? [1, 0] : [0, 1] };
        });
      },
    };

    const result = await selectRelevantKnowledgeWithEmbedding(
      'Rust 성능 쿼리',
      [
        item('title', 'Rust 성능 분석', '결과'),
        item('tag', '벤치마크', '결과', ['rust', '성능']),
        item('body', '메모', 'Rust 성능을 측정했다'),
      ],
      embedDeps,
      { limit: 2 },
    );
    // 휴리스틱 최하위였던 'body'가 코사인 1.0으로 1순위가 된다. 'title'과
    // 'tag'는 동점(코사인 0)이라 후보 순서가 유지된다(정렬 안정성).
    expect(result.map((entry) => entry.id)).toEqual(['body', 'tag']);
  });

  test('임베더가 실패하거나 대상이 없으면 휴리스틱 순서로 폴백한다', async () => {
    const items = [
      item('title', 'Rust 성능 분석', '결과'),
      item('body', '메모', 'Rust 성능을 측정했다'),
    ];
    const failing: SemanticEmbedDeps = {
      async resolveEmbeddingTarget() {
        return null;
      },
      async embedBatch() {
        throw new Error('model not loaded');
      },
    };
    const throwing: SemanticEmbedDeps = {
      async resolveEmbeddingTarget() {
        throw new Error('boom');
      },
      async embedBatch() {
        throw new Error('unreachable');
      },
    };

    const heuristic = selectRelevantKnowledge('Rust 성능', items);
    expect((await selectRelevantKnowledgeWithEmbedding('Rust 성능', items, failing)).map((entry) => entry.id))
      .toEqual(heuristic.map((entry) => entry.id));
    expect((await selectRelevantKnowledgeWithEmbedding('Rust 성능', items, throwing)).map((entry) => entry.id))
      .toEqual(heuristic.map((entry) => entry.id));
  });

  test('keeps the most recent conversation turns within the budget', () => {
    const result = selectRecentChatMessages(
      [
        { role: 'user', content: 'old-old' },
        { role: 'assistant', content: 'old' },
        { role: 'user', content: 'new' },
      ],
      7
    );
    expect(result).toEqual([
      { role: 'assistant', content: 'old' },
      { role: 'user', content: 'new' },
    ]);
  });

  test('formats source markers for grounded answers', () => {
    const formatted = formatKnowledgeContext([item('a', '제목', '본문')]);
    expect(formatted).toContain('[지식 1]');
    expect(formatted).toContain('제목: 제목');
  });
});
