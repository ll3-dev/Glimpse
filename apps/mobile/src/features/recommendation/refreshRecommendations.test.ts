import { describe, expect, mock, test } from 'bun:test';
import type {
  GraphAnalysisCommitInput,
  GraphAnalysisRecord,
  KnowledgeItem,
  Recommendation,
} from '@glimpse/shared';
import {
  createRefreshRecommendations,
  type RecommendationRefreshDeps,
} from './refreshRecommendations';

function item(id: string, tags: string[], updatedAt = 1): KnowledgeItem {
  return {
    id, type: 'note', title: id, body: null, url: null, summary: null, tags,
    createdAt: 1, updatedAt, stability: null, difficulty: null,
    lastReviewedAt: null, nextReviewAt: null,
  };
}

function record(itemId: string, itemUpdatedAt = 1): GraphAnalysisRecord {
  return {
    itemId, itemUpdatedAt, analyzerVersion: 'living-graph-v1', analyzedAt: 10,
    edgeCount: 0, status: 'completed', failureCount: 0,
  };
}

function deps(overrides: Partial<RecommendationRefreshDeps> = {}): RecommendationRefreshDeps {
  return {
    now: () => 100,
    createId: (() => {
      let id = 0;
      return () => `edge-${id++}`;
    })(),
    batchLimit: 4,
    listItems: async () => [item('a', ['rust']), item('b', ['rust'])],
    listAnalysisRecords: async () => [],
    listRecommendations: async () => [],
    proposeEdges: async () => [],
    commitAnalysis: async (input) => ({
      savedRecommendations: input.recommendations.length,
      savedAnalysisRecords: input.records.length,
    }),
    ...overrides,
  };
}

describe('mobile Living Graph refresh', () => {
  test('한 사이클의 처리·생략 수와 실행 시간을 로컬 측정기에 전달한다', async () => {
    const samples: {
      succeeded: boolean;
      durationMs: number;
      processedCount: number;
      skippedCount: number;
      recordedAt: number;
    }[] = [];
    const ticks = [5, 17];
    const result = await createRefreshRecommendations(deps({
      measureNow: () => ticks.shift() ?? 17,
      recordCycle: (sample) => samples.push(sample),
      listItems: async () => [item('done', [], 1), item('new', [], 2)],
      listAnalysisRecords: async () => [record('done')],
    }))();

    expect(result).toMatchObject({ success: true, processedCount: 1 });
    expect(samples).toEqual([{
      succeeded: true,
      durationMs: 12,
      processedCount: 1,
      skippedCount: 1,
      recordedAt: 100,
    }]);
  });

  test('AI가 비어도 태그 폴백과 원자 커밋으로 연결·워터마크를 저장한다', async () => {
    const commits: GraphAnalysisCommitInput[] = [];
    const commitAnalysis = mock(async (input: GraphAnalysisCommitInput) => {
      commits.push(input);
      return {
        savedRecommendations: input.recommendations.length,
        savedAnalysisRecords: input.records.length,
      };
    });

    const result = await createRefreshRecommendations(deps({ commitAnalysis }))();

    expect(result).toMatchObject({
      success: true, skipped: false, createdCount: 1, processedCount: 2,
      source: 'tag-overlap',
    });
    expect(commits[0].recommendations[0]).toMatchObject({ itemA_id: 'a', itemB_id: 'b' });
    expect(commits[0].records.map(({ status, edgeCount }) => ({ status, edgeCount })))
      .toEqual([
        { status: 'completed', edgeCount: 1 },
        { status: 'completed', edgeCount: 1 },
      ]);
  });

  test('0-edge 항목도 completed로 기록하고 다음 실행은 no_dirty로 건너뛴다', async () => {
    let records: GraphAnalysisRecord[] = [];
    const refresh = createRefreshRecommendations(deps({
      listItems: async () => [item('solo', [])],
      listAnalysisRecords: async () => records,
      commitAnalysis: async (input) => {
        records = input.records;
        return { savedRecommendations: 0, savedAnalysisRecords: input.records.length };
      },
    }));

    expect(await refresh()).toMatchObject({
      success: true, skipped: false, createdCount: 0, processedCount: 1,
    });
    expect(records[0]).toMatchObject({ itemId: 'solo', edgeCount: 0, status: 'completed' });
    expect(await refresh()).toEqual({
      success: true, skipped: true, reason: 'no_dirty', createdCount: 0,
      processedCount: 0, remainingBacklog: 0,
    });
  });

  test('수정된 항목만 4개 배치로 처리하고 기존 ignored pair를 재생성하지 않는다', async () => {
    const items = Array.from({ length: 6 }, (_, index) => item(`i${index}`, ['x'], index + 2));
    const existing: Recommendation = {
      id: 'ignored', itemA_id: 'i5', itemB_id: 'clean', reason: null,
      status: 'ignored', createdAt: 1, respondedAt: 1,
    };
    const commits: GraphAnalysisCommitInput[] = [];
    const result = await createRefreshRecommendations(deps({
      listItems: async () => [...items, item('clean', ['x'], 1)],
      listAnalysisRecords: async () => [record('clean')],
      listRecommendations: async () => [existing],
      commitAnalysis: async (input) => {
        commits.push(input);
        return {
          savedRecommendations: input.recommendations.length,
          savedAnalysisRecords: input.records.length,
        };
      },
    }))();

    expect(result).toMatchObject({ processedCount: 4, remainingBacklog: 2 });
    expect(commits[0].records.map(({ itemId }) => itemId)).toEqual(['i5', 'i4', 'i3', 'i2']);
    expect(commits[0].recommendations.some(
      (edge) => [edge.itemA_id, edge.itemB_id].sort().join('|') === 'clean|i5',
    )).toBe(false);
  });
});
