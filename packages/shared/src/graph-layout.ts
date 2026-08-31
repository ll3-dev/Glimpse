import type { KnowledgeItem, Recommendation } from './index';

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  source: GraphNode;
  target: GraphNode;
  reason: string | null;
}

export function layoutGraph(items: KnowledgeItem[], recommendations: Recommendation[]) {
  const visibleRecommendations = recommendations.filter(
    (edge) => edge.status === 'pending' || edge.status === 'accepted',
  );
  const connectedIds = new Set<string>();
  for (const edge of visibleRecommendations) {
    connectedIds.add(edge.itemA_id);
    connectedIds.add(edge.itemB_id);
  }
  const visibleItems = [...items]
    .sort((left, right) => {
      const connectionDelta = Number(connectedIds.has(right.id)) - Number(connectedIds.has(left.id));
      return connectionDelta || right.updatedAt - left.updatedAt;
    })
    .slice(0, 36);
  const centerX = 500;
  const centerY = 330;
  const radiusX = Math.min(390, 125 + visibleItems.length * 10);
  const radiusY = Math.min(245, 95 + visibleItems.length * 6);
  const nodes = visibleItems.map((item, index): GraphNode => {
    const angle = (Math.PI * 2 * index) / visibleItems.length - Math.PI / 2;
    return {
      id: item.id,
      label: item.title?.trim() || item.summary?.trim() || 'Untitled',
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    };
  });
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges = visibleRecommendations.flatMap((edge): GraphEdge[] => {
    const source = nodeMap.get(edge.itemA_id);
    const target = nodeMap.get(edge.itemB_id);
    return source && target ? [{ id: edge.id, source, target, reason: edge.reason }] : [];
  });
  return { nodes, edges };
}
