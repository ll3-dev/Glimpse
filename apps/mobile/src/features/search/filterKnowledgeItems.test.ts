import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { filterKnowledgeItems } from './filterKnowledgeItems';

const baseItem: Omit<KnowledgeItem, 'id' | 'type'> = {
  title: null,
  body: null,
  url: null,
  summary: null,
  tags: null,
  createdAt: 0,
  updatedAt: 0,
  stability: null,
  difficulty: null,
  lastReviewedAt: null,
  nextReviewAt: null,
};

function item(partial: Partial<KnowledgeItem> & Pick<KnowledgeItem, 'id' | 'type'>): KnowledgeItem {
  return { ...baseItem, ...partial } as KnowledgeItem;
}

describe('filterKnowledgeItems', () => {
  const items = [
    item({ id: '1', type: 'note', title: 'React Basics', body: 'hooks and state' }),
    item({ id: '2', type: 'link', body: 'database tips', tags: ['SQLite', 'Drizzle'] }),
    item({ id: '3', type: 'link', url: 'https://example.com/swift' }),
    item({ id: '4', type: 'note', title: '토스 한글 검색', body: '초성 매칭 지원' }),
  ];

  test('returns all items when query is empty', () => {
    expect(filterKnowledgeItems(items, '   ')).toEqual(items);
  });

  test('matches title/body case-insensitively', () => {
    const result = filterKnowledgeItems(items, 'react');
    expect(result.map((v) => v.id)).toEqual(['1']);
  });

  test('matches tags case-insensitively', () => {
    const result = filterKnowledgeItems(items, 'drizzle');
    expect(result.map((v) => v.id)).toEqual(['2']);
  });

  test('matches url as fallback', () => {
    const result = filterKnowledgeItems(items, 'swift');
    expect(result.map((v) => v.id)).toEqual(['3']);
  });

  test('matches Korean initial consonants via toss hangul', () => {
    const result = filterKnowledgeItems(items, 'ㅌㅅ');
    expect(result.map((v) => v.id)).toEqual(['4']);
  });
});
