import { describe, expect, test } from 'bun:test';
import type {
  CoreClient,
  GraphAnalysisCommitInput,
  GraphAnalysisRecord,
  KnowledgeItem,
  Recommendation,
} from '@glimpse/shared';
import { LIVING_GRAPH_ANALYZER_VERSION } from '@glimpse/features';
import { parseEdges } from './graph-edge-parser';
import { generateKnowledgeGraph } from './generate-knowledge-graph';

describe('desktop knowledge graph AI response parser', () => {
  test('fenced·truncated 응답에서 유효한 edge만 복구한다', () => {
    expect(parseEdges('```json\n[{"itemAId":"a","itemBId":"b","reason":"related"}]\n```'))
      .toEqual([{ itemAId: 'a', itemBId: 'b', reason: 'related' }]);
    expect(parseEdges('[{"itemAId":"a","itemBId":"b","reason":"r"},{"itemAId":"c"'))
      .toEqual([{ itemAId: 'a', itemBId: 'b', reason: 'r' }]);
  });
});

function item(id: string, tags: string[], updatedAt = 1): KnowledgeItem {
  return {
    id, type: 'note', title: `title-${id}`, body: null, url: null, summary: null,
    tags, createdAt: 0, updatedAt, stability: null, difficulty: null,
    lastReviewedAt: null, nextReviewAt: null,
  };
}

function record(itemId: string, itemUpdatedAt = 1): GraphAnalysisRecord {
  return {
    itemId, itemUpdatedAt, analyzerVersion: LIVING_GRAPH_ANALYZER_VERSION,
    analyzedAt: 1_000, edgeCount: 0, status: 'completed', failureCount: 0,
  };
}

function createCore(initialRecords: GraphAnalysisRecord[] = [], initialEdges: Recommendation[] = []) {
  let records = [...initialRecords];
  const edges = [...initialEdges];
  const commits: GraphAnalysisCommitInput[] = [];
  const coreClient = {
    listGraphAnalysisRecords: async () => records,
    listRecommendations: async () => edges,
    commitGraphAnalysis: async (input: GraphAnalysisCommitInput) => {
      commits.push(input);
      records = input.records;
      edges.push(...input.recommendations);
      return {
        savedRecommendations: input.recommendations.length,
        savedAnalysisRecords: input.records.length,
      };
    },
  } as unknown as CoreClient;
  return { coreClient, commits };
}

describe('desktop Living Graph cycle', () => {
  test('0-edge 배치도 completed watermark를 남겨 재실행에서 건너뛴다', async () => {
    const items = [item('a', []), item('b', [])];
    const { coreClient, commits } = createCore();

    const first = await generateKnowledgeGraph(coreClient, items);
    const second = await generateKnowledgeGraph(coreClient, items);

    expect(first.processedCount).toBe(2);
    expect(first.createdCount).toBe(0);
    expect(commits[0].records.map(({ edgeCount, status }) => ({ edgeCount, status })))
      .toEqual([
        { edgeCount: 0, status: 'completed' },
        { edgeCount: 0, status: 'completed' },
      ]);
    expect(second).toMatchObject({ processedCount: 0, source: 'unchanged' });
    expect(commits).toHaveLength(1);
  });

  test('신규 항목만 분석하고 clean 항목은 후보 풀로 사용한다', async () => {
    const items = [
      item('a', ['rust']), item('b', ['sync']), item('c', ['rust']),
      item('d', ['rust'], 3), item('e', ['golang'], 2),
    ];
    const { coreClient, commits } = createCore([record('a'), record('b'), record('c')]);

    const result = await generateKnowledgeGraph(coreClient, items);

    expect(result).toMatchObject({ createdCount: 2, processedCount: 2, source: 'tag-overlap' });
    expect(commits[0].records.map(({ itemId }) => itemId)).toEqual(['d', 'e']);
    for (const edge of commits[0].recommendations) {
      expect(
        ['d', 'e'].includes(edge.itemA_id) || ['d', 'e'].includes(edge.itemB_id),
      ).toBe(true);
    }
  });

  test('배치 상한 8개를 0-edge 여부와 무관하게 진전으로 보고 잔여 2개를 알린다', async () => {
    const items = Array.from({ length: 10 }, (_, index) => item(`i${index}`, [], index + 1));
    const { coreClient, commits } = createCore();

    const result = await generateKnowledgeGraph(coreClient, items);

    expect(result).toMatchObject({ createdCount: 0, processedCount: 8, remainingBacklog: 2 });
    expect(commits[0].records.map(({ itemId }) => itemId))
      .toEqual(['i9', 'i8', 'i7', 'i6', 'i5', 'i4', 'i3', 'i2']);
  });
});
