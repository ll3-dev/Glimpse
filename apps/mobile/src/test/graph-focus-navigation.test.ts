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
    expect(graph).toMatch(/router\.setParams\(\{ focusId: itemId \?\? (['"])\1 \}\)/);
    expect(graph).toContain('layoutFocusedGraph(items, recommendations, focusedNodeId)');
  });

  test('오늘의 발견 상세 이동은 로컬 품질 카운터를 남긴다', async () => {
    const graph = await source('apps/mobile/app/(tabs)/graph.tsx');

    expect(graph).toContain('recordMobileGraphDiscoveryOpen();');
    expect(graph).toContain('onOpenDiscoveryItem');
  });
});
