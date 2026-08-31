import type { GraphEdge } from '@glimpse/shared';

/**
 * 노드 선택 상태를 렌더 친화형 집합으로 변환하는 순수 유틸.
 * 데스크톱 KnowledgeGraph의 useMemo 선택 로직과 동일한 의미론을 유지한다.
 */
export interface GraphSelection {
  selectedId: string;
  /** 선택 노드 + 인접 노드 (하이라이트 유지 대상) */
  connectedIds: Set<string>;
  /** 선택 노드에 인접한 엣지 (진하게 렌더) */
  activeEdgeIds: Set<string>;
  /** 인접 엣지의 reason 목록 (엣지 순서, null 제외) — 선택 바 요약용 */
  incidentReasons: string[];
}

export function computeGraphSelection(
  selectedNodeId: string | null,
  edges: GraphEdge[],
): GraphSelection | null {
  if (!selectedNodeId) return null;
  const connectedIds = new Set<string>([selectedNodeId]);
  const activeEdgeIds = new Set<string>();
  const incidentReasons: string[] = [];
  for (const edge of edges) {
    const otherId =
      edge.source.id === selectedNodeId
        ? edge.target.id
        : edge.target.id === selectedNodeId
          ? edge.source.id
          : null;
    if (otherId) {
      connectedIds.add(otherId);
      activeEdgeIds.add(edge.id);
      if (edge.reason) incidentReasons.push(edge.reason);
    }
  }
  return { selectedId: selectedNodeId, connectedIds, activeEdgeIds, incidentReasons };
}
