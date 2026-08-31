import { describe, expect, test } from 'bun:test';

const workspaceRoot = new URL('../../../../', import.meta.url);

async function source(relativePath: string): Promise<string> {
  return Bun.file(new URL(relativePath, workspaceRoot)).text();
}

describe('mobile graph focus navigation source contract', () => {
  test('검색·상세 진입이 focusId를 전달하고 그래프 화면이 이를 읽는다', async () => {
    const [library, detail, graph] = await Promise.all([
      source('apps/mobile/app/(tabs)/library.tsx'),
      source('apps/mobile/app/library/[id].tsx'),
      source('apps/mobile/app/(tabs)/graph.tsx'),
    ]);

    expect(library).toContain("params: { focusId: rerankedItems[0].id }");
    expect(detail).toContain("params: { focusId: item.id }");
    expect(graph).toContain('useLocalSearchParams<{ focusId?: string | string[] }>()');
    expect(graph).toContain("router.setParams({ focusId: itemId ?? '' })");
    expect(graph).toContain('layoutFocusedGraph(items, recommendations, focusedNodeId)');
  });
});
