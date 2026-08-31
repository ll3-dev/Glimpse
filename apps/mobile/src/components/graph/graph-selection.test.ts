import { describe, expect, test } from 'bun:test';
import type { GraphEdge } from '@glimpse/shared';
import { computeGraphSelection } from './graph-selection';

function node(id: string) {
  return { id, label: id, x: 0, y: 0 };
}

function edge(id: string, a: string, b: string, reason: string | null = null): GraphEdge {
  return { id, source: node(a), target: node(b), reason };
}

describe('computeGraphSelection', () => {
  test('선택 노드와 인접 노드, 활성 엣지를 계산한다', () => {
    const edges = [edge('e1', 'a', 'b', '근거1'), edge('e2', 'b', 'c'), edge('e3', 'c', 'd')];
    const selection = computeGraphSelection('a', edges);
    expect(selection.connectedIds).toEqual(new Set(['a', 'b']));
    expect(selection.activeEdgeIds).toEqual(new Set(['e1']));
  });

  test('인접 엣지의 reason을 엣지 순서대로 수집한다 (null 제외)', () => {
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'a', 'c', '근거2'), edge('e3', 'c', 'd', '무관')];
    const selection = computeGraphSelection('a', edges);
    expect(selection.incidentReasons).toEqual(['근거2']);
  });

  test('선택이 null이면 null을 반환한다', () => {
    expect(computeGraphSelection(null, [edge('e1', 'a', 'b')])).toBeNull();
  });
});
