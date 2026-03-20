import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import {
  deriveRuleBasedLabels,
  formatKnowledgeLabel,
  getDisplayLabels,
} from './rule-based-labeler';

function createItem(overrides?: Partial<KnowledgeItem>): KnowledgeItem {
  return {
    id: 'item-1',
    type: 'note',
    title: 'Weekly work meeting',
    body: 'Action item: follow up with client on sprint launch',
    url: null,
    summary: null,
    tags: ['planning'],
    createdAt: 1,
    updatedAt: 1,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    ...overrides,
  };
}

describe('deriveRuleBasedLabels', () => {
  test('adds work, meeting, and todo labels for meeting notes', () => {
    const result = deriveRuleBasedLabels(createItem());

    expect(result.labels).toContain('todo');
    expect(result.labels).toContain('meeting');
    expect(result.labels.some((label) => label === 'work' || label === 'project')).toBe(true);
    expect(result.source).toBe('rules');
  });

  test('uses reference and learning labels for developer links', () => {
    const result = deriveRuleBasedLabels(
      createItem({
        type: 'link',
        title: 'React Native docs',
        body: 'Official guide',
        url: 'https://developer.apple.com/documentation',
      })
    );

    expect(result.labels).toContain('reference');
    expect(result.labels).toContain('learning');
  });

  test('matches Korean keywords for project tasks', () => {
    const result = deriveRuleBasedLabels(
      createItem({
        title: '프로젝트 회의',
        body: '후속 작업: 명세 수정하고 배포 일정 정리',
      })
    );

    expect(result.labels).toContain('project');
    expect(result.labels).toContain('meeting');
    expect(result.labels).toContain('todo');
  });
});

describe('getDisplayLabels', () => {
  test('prefers final labels over provisional labels', () => {
    expect(
      getDisplayLabels({
        labels: ['work'],
        provisionalLabels: ['todo'],
      })
    ).toEqual(['work']);
  });

  test('falls back to provisional labels', () => {
    expect(
      getDisplayLabels({
        labels: null,
        provisionalLabels: ['todo'],
      })
    ).toEqual(['todo']);
  });

  test('formats labels in Korean', () => {
    expect(formatKnowledgeLabel('reference')).toBe('참고자료');
  });
});
