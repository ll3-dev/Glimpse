import { describe, expect, test } from 'bun:test';

const desktopRoot = new URL('../../', import.meta.url);

async function source(relativePath: string): Promise<string> {
  return Bun.file(new URL(relativePath, desktopRoot)).text();
}

describe('desktop graph focus navigation source contract', () => {
  test('검색·상세가 focus search를 전달하고 graph route가 검증한다', async () => {
    const [library, detail, graph] = await Promise.all([
      source('app/_authenticated/library/index.tsx'),
      source('app/_authenticated/library/$itemId.tsx'),
      source('app/_authenticated/graph.tsx'),
    ]);

    expect(library).toContain("search: { focus: filteredItems[0].id }");
    expect(detail).toContain("search: { focus: item.id }");
    expect(graph).toContain('validateSearch');
    expect(graph).toContain('selectTodayDiscoveries');
  });

  test('그래프는 focus 좌표와 키보드 가능한 노드·엣지를 사용한다', async () => {
    const [graph, canvas] = await Promise.all([
      source('components/graph/KnowledgeGraph.tsx'),
      source('components/graph/GraphCanvas.tsx'),
    ]);
    expect(graph).toContain('layoutFocusedGraph');
    expect(canvas.match(/tabIndex=\{0\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(canvas).toContain('event.key === \'Enter\' || event.key === \' \'');
  });
});
