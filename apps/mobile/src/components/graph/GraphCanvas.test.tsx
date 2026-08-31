import { describe, expect, mock, test } from 'bun:test';
import type { GraphEdge, GraphNode } from '@glimpse/shared';

/**
 * GraphCanvas 렌더 검증.
 *
 * - react-native-svg를 호스트 문자열 더미로 목킹(setup.ts의 react-native 목과
 *   동일 방식). useSemanticColor는 uniwind JSI 의존이므로 모듈 자체를 고정 스텁으로
 *   대체한다(실제 로드 시 RN named-export 정적 링크 검증과 충돌).
 * - bun test 환경엔 DOM이 없으므로 react-dom/server로 정적 마크업을 렌더해
 *   요소 개수·라벨·디밍 투명도를 검증한다.
 */

const svgHosts: Record<string, string> = {
  Svg: 'svg', G: 'g', Line: 'line', Circle: 'circle', Text: 'text',
};
mock.module('react-native-svg', () => svgHosts);
mock.module('@glimpse/ui', () => ({
  useSemanticColor: (_name: string) => 'gray',
}));

const { renderToStaticMarkup } = await import('react-dom/server');
const { GraphCanvas } = await import('./GraphCanvas');

function node(id: string, x: number, y: number): GraphNode {
  return { id, label: `라벨-${id}`, x, y };
}

describe('GraphCanvas', () => {
  const nodes = [node('a', 100, 100), node('b', 300, 100), node('c', 500, 100)];
  const edges: GraphEdge[] = [
    { id: 'e1', source: nodes[0], target: nodes[1], reason: '근거' },
  ];

  const render = (selectedNodeId: string | null) =>
    renderToStaticMarkup(
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        selectedNodeId={selectedNodeId}
        palette={['red', 'orange', 'green', 'blue', 'purple']}
        onPressNode={() => {}}
        lineColor="gray"
        strokeColor="silver"
        labelColor="black"
        selectedStrokeColor="navy"
      />,
    );

  test('노드당 바깥원+안점 2개씩 총 6개 circle을 렌더한다', () => {
    expect(render(null).match(/<circle/g)?.length).toBe(6);
  });

  test('노드 라벨을 렌더한다', () => {
    expect(render(null)).toContain('라벨-a');
  });

  test('선택 시 비인접 노드가 디밍된다', () => {
    // c는 a와 인접하지 않으므로 디밍 투명도가 적용된다
    expect(render('a')).toContain('0.35');
  });
});
