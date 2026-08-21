import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import {
  buildChatKnowledgeContext,
  formatKnowledgeContext,
  selectRecentChatMessages,
  selectRelevantKnowledge,
} from './chat-context';

function item(id: string, title: string, body: string, tags: string[] = []): KnowledgeItem {
  return {
    id,
    type: 'note',
    title,
    body,
    tags,
    summary: null,
    createdAt: 1,
    updatedAt: 1,
    lastReviewedAt: null,
    nextReviewAt: null,
    reviewCount: 0,
    embedding: null,
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

  test('keeps the explicit context first and excludes it from retrieval', () => {
    const primary = item('primary', 'Rust', '기본 문서');
    const result = buildChatKnowledgeContext('Rust', primary, [
      primary,
      item('related', 'Rust 메모', '관련 문서'),
    ]);
    expect(result.map((entry) => entry.id)).toEqual(['primary', 'related']);
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
