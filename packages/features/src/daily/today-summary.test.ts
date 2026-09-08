import { describe, expect, test } from 'bun:test';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import {
  TODAY_SUMMARY_PREVIEW_LIMIT,
  buildTodaySummary,
  startOfLocalDay,
} from './today-summary';

function item(overrides: Partial<KnowledgeItem> & { id: string }): KnowledgeItem {
  return {
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
    updatedAt: null,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    createdAt: 0,
    ...overrides,
  };
}

function edge(id: string, createdAt: number): Recommendation {
  return {
    id,
    itemA_id: 'a',
    itemB_id: 'b',
    reason: null,
    status: 'pending',
    createdAt,
    respondedAt: null,
  };
}

describe('startOfLocalDay', () => {
  test('returns local midnight for a mid-day timestamp', () => {
    const dayStart = startOfLocalDay(new Date(2026, 8, 8, 15, 30));
    expect(dayStart).toBe(new Date(2026, 8, 8, 0, 0, 0, 0).getTime());
  });
});

describe('buildTodaySummary', () => {
  test('only counts items and edges created after local midnight', () => {
    const dayStart = startOfLocalDay(new Date(2026, 8, 8, 20));
    const summary = buildTodaySummary(
      [
        item({ id: 'today', createdAt: dayStart + 60_000 }),
        item({ id: 'yesterday', createdAt: dayStart - 1 }),
      ],
      [edge('today-edge', dayStart + 1), edge('old-edge', dayStart - 1)],
      { now: () => new Date(2026, 8, 8, 21).getTime() },
    );

    expect(summary.captureCount).toBe(1);
    expect(summary.captures.map((entry) => entry.id)).toEqual(['today']);
    expect(summary.newConnectionCount).toBe(1);
  });

  test('captures are newest-first and capped at the preview limit', () => {
    const now = new Date(2026, 8, 8, 12).getTime();
    const dayStart = startOfLocalDay(new Date(now));
    const items = Array.from({ length: TODAY_SUMMARY_PREVIEW_LIMIT + 3 }, (_, i) =>
      item({ id: `item-${i}`, createdAt: dayStart + i }),
    );

    const summary = buildTodaySummary(items, [], { now: () => now });

    expect(summary.captureCount).toBe(TODAY_SUMMARY_PREVIEW_LIMIT + 3);
    expect(summary.captures).toHaveLength(TODAY_SUMMARY_PREVIEW_LIMIT);
    expect(summary.captures[0].id).toBe(`item-${TODAY_SUMMARY_PREVIEW_LIMIT + 2}`);
  });

  test('preview prefers summary, then body, then url, then title — with truncation', () => {
    const now = new Date(2026, 8, 8, 12).getTime();
    const dayStart = startOfLocalDay(new Date(now));
    const long = 'a'.repeat(200);

    const summary = buildTodaySummary(
      [
        item({ id: 's', createdAt: dayStart + 1, title: 'T', body: 'B', summary: 'S', url: 'U' }),
        item({ id: 'b', createdAt: dayStart + 2, title: 'T', body: 'B', url: 'U' }),
        item({ id: 'u', createdAt: dayStart + 3, title: 'T', url: 'U' }),
        item({ id: 't', createdAt: dayStart + 4, title: 'T' }),
        item({ id: 'long', createdAt: dayStart + 5, body: long }),
      ],
      [],
      { now: () => now },
    );

    const byId = new Map(summary.captures.map((entry) => [entry.id, entry.preview]));
    expect(byId.get('s')).toBe('S');
    expect(byId.get('b')).toBe('B');
    expect(byId.get('u')).toBe('U');
    expect(byId.get('t')).toBe('T');
    expect(byId.get('long')).toHaveLength(120);
    expect(byId.get('long')?.endsWith('…')).toBe(true);
  });

  test('empty inputs produce an all-zero summary', () => {
    const summary = buildTodaySummary([], []);
    expect(summary).toEqual({
      captureCount: 0,
      captures: [],
      newConnectionCount: 0,
    });
  });
});
