import { describe, expect, test } from 'bun:test';
import { parseEdges } from './graph-edge-parser';
import { generateKnowledgeGraph } from './generate-knowledge-graph';
import type { CoreClient, KnowledgeItem, Recommendation } from '@glimpse/shared';

describe('desktop knowledge graph AI response parser', () => {
  test('extracts a JSON edge array from a fenced response', () => {
    expect(
      parseEdges('```json\n[{"itemAId":"a","itemBId":"b","reason":"related"}]\n```'),
    ).toEqual([{ itemAId: 'a', itemBId: 'b', reason: 'related' }]);
  });

  test('drops malformed or non-JSON responses', () => {
    expect(parseEdges('[{"itemAId":"a","itemBId":2,"reason":"bad"}]')).toEqual([]);
    expect(parseEdges('no graph')).toEqual([]);
  });

  test('prose citations do not poison array extraction', () => {
    expect(
      parseEdges(
        '결과 [1]을 참고 [{"itemAId":"a","itemBId":"b","reason":"ok"}]',
      ),
    ).toEqual([{ itemAId: 'a', itemBId: 'b', reason: 'ok' }]);
  });

  test('truncated responses keep earlier complete edges', () => {
    expect(
      parseEdges('[{"itemAId":"a","itemBId":"b","reason":"r"},{"itemAId":"c"'),
    ).toEqual([{ itemAId: 'a', itemBId: 'b', reason: 'r' }]);
  });
});

// ---------------------------------------------------------------------------
// 증분 사이클 — 기본 설정(rules)에서 결정론 폴백으로 통합 검증
// ---------------------------------------------------------------------------

const item = (id: string, tags: string[], updatedAt = 1): KnowledgeItem =>
  ({
    id,
    type: 'note',
    title: `title-${id}`,
    body: null,
    url: null,
    summary: null,
    tags,
    createdAt: 0,
    updatedAt,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
  }) as KnowledgeItem;

const edge = (itemA: string, itemB: string, createdAt = 1_000): Recommendation =>
  ({
    id: `${itemA}-${itemB}`,
    itemA_id: itemA,
    itemB_id: itemB,
    reason: null,
    status: 'pending',
    createdAt,
    respondedAt: null,
  }) as Recommendation;

function mockCoreClient(existing: Recommendation[]): {
  coreClient: CoreClient;
  saved: Recommendation[][];
} {
  const saved: Recommendation[][] = [];
  const coreClient = {
    listRecommendations: async () => existing,
    saveRecommendations: async (recs: Recommendation[]) => {
      saved.push(recs);
    },
  } as unknown as CoreClient;
  return { coreClient, saved };
}

const pairKeyOf = (record: Recommendation): string =>
  [record.itemA_id, record.itemB_id].sort().join('|');

describe('증분 사이클', () => {
  test('신규 아이템만 분석 — analyzed 아이템은 후보로만 등장', async () => {
    // a, b, c는 기존 엣지로 analyzed / d, e는 신규
    const existing = [edge('a', 'b'), edge('a', 'c')];
    const items = [
      item('a', ['rust']),
      item('b', ['sync']),
      item('c', ['rust']),
      item('d', ['rust'], 3),
      item('e', ['golang'], 2),
    ];
    const { coreClient, saved } = mockCoreClient(existing);

    const result = await generateKnowledgeGraph(coreClient, items);

    // 새 엣지는 최소 한쪽이 신규 아이템 d 또는 e — analyzed끼리 새 엣지 없음
    const flattened = saved.flat();
    for (const record of flattened) {
      const involvesNew =
        ['d', 'e'].includes(record.itemA_id) || ['d', 'e'].includes(record.itemB_id);
      expect(involvesNew).toBe(true);
    }
    // d(rust)는 a·c와 태그 겹침 → 2엣지, e는 겹침 없음
    expect(result.createdCount).toBe(2);
    expect(result.source).toBe('tag-overlap');
  });

  test('기존 엣지 유지 + 새 엣지만 추가', async () => {
    const existing = [edge('a', 'b')];
    const items = [
      item('a', ['rust']),
      item('b', ['sync']),
      item('d', ['rust', 'sync'], 3),
    ];
    const { coreClient, saved } = mockCoreClient(existing);

    const result = await generateKnowledgeGraph(coreClient, items);

    const flattened = saved.flat();
    const savedKeys = flattened.map(pairKeyOf);
    // 기존 a-b 엣지가 다시 저장되지 않음
    expect(savedKeys).not.toContain('a|b');
    // d-a, d-b 신규 엣지만 저장
    expect(savedKeys.sort()).toEqual(['a|d', 'b|d']);
    expect(result.createdCount).toBe(2);
  });

  test('배치 상한 8개 — 백로그 시 최신 우선만 분석', async () => {
    // i0..i9 (updatedAt 1..10) — 최신 8개(i9..i2)만 이번 사이클 대상
    const items = Array.from({ length: 10 }, (_, index) =>
      item(`i${index}`, ['shared'], index + 1),
    );
    const { coreClient, saved } = mockCoreClient([]);

    const result = await generateKnowledgeGraph(coreClient, items);

    const flattened = saved.flat();
    expect(flattened.length).toBeGreaterThan(0);
    for (const record of flattened) {
      expect(['i0', 'i1']).not.toContain(record.itemA_id);
      expect(['i0', 'i1']).not.toContain(record.itemB_id);
    }
    expect(result.createdCount).toBe(flattened.length);
  });

  test('분석 대상이 없으면 저장 호출 없이 unchanged', async () => {
    const existing = [edge('a', 'b')];
    const items = [item('a', ['rust']), item('b', ['sync'])];
    const { coreClient, saved } = mockCoreClient(existing);

    const result = await generateKnowledgeGraph(coreClient, items);

    expect(result).toEqual({ createdCount: 0, source: 'unchanged', remainingBacklog: 0 });
    expect(saved).toHaveLength(0);
  });
});
