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

const MAX_VISIBLE_NODES = 36;

function visibleRecommendations(recommendations: Recommendation[]): Recommendation[] {
  return recommendations.filter(
    (edge) => edge.status === 'pending' || edge.status === 'accepted',
  );
}

function nodeLabel(item: KnowledgeItem): string {
  return item.title?.trim() || item.summary?.trim() || 'Untitled';
}

function mapEdges(recommendations: Recommendation[], nodes: GraphNode[]): GraphEdge[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  return recommendations.flatMap((edge): GraphEdge[] => {
    const source = nodeMap.get(edge.itemA_id);
    const target = nodeMap.get(edge.itemB_id);
    return source && target ? [{ id: edge.id, source, target, reason: edge.reason }] : [];
  });
}

export function layoutGraph(items: KnowledgeItem[], recommendations: Recommendation[]) {
  const visibleEdges = visibleRecommendations(recommendations);
  const connectedIds = new Set<string>();
  for (const edge of visibleEdges) {
    connectedIds.add(edge.itemA_id);
    connectedIds.add(edge.itemB_id);
  }
  const visibleItems = [...items]
    .sort((left, right) => {
      const connectionDelta = Number(connectedIds.has(right.id)) - Number(connectedIds.has(left.id));
      return connectionDelta || right.updatedAt - left.updatedAt;
    })
    .slice(0, MAX_VISIBLE_NODES);
  const centerX = 500;
  const centerY = 330;
  const radiusX = Math.min(390, 125 + visibleItems.length * 10);
  const radiusY = Math.min(245, 95 + visibleItems.length * 6);
  const nodes = visibleItems.map((item, index): GraphNode => {
    const angle = (Math.PI * 2 * index) / visibleItems.length - Math.PI / 2;
    return {
      id: item.id,
      label: nodeLabel(item),
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    };
  });
  return { nodes, edges: mapEdges(visibleEdges, nodes) };
}

function byUpdatedAtThenId(left: KnowledgeItem, right: KnowledgeItem): number {
  return right.updatedAt - left.updatedAt || left.id.localeCompare(right.id);
}

export function layoutFocusedGraph(
  items: KnowledgeItem[],
  recommendations: Recommendation[],
  focusId: string,
) {
  const focus = items.find(({ id }) => id === focusId);
  if (!focus) return layoutGraph(items, recommendations);

  const visibleEdges = visibleRecommendations(recommendations);
  const neighborIds = new Set<string>();
  for (const edge of visibleEdges) {
    if (edge.itemA_id === focusId) neighborIds.add(edge.itemB_id);
    if (edge.itemB_id === focusId) neighborIds.add(edge.itemA_id);
  }

  const neighbors = items
    .filter(({ id }) => neighborIds.has(id))
    .sort(byUpdatedAtThenId);
  const context = items
    .filter(({ id }) => id !== focusId && !neighborIds.has(id))
    .sort(byUpdatedAtThenId);
  const visibleItems = [focus, ...neighbors, ...context].slice(0, MAX_VISIBLE_NODES);
  const centerX = 500;
  const centerY = 320;
  const visibleNeighborIds = new Set(neighbors.map(({ id }) => id));
  const visibleNeighbors = visibleItems.filter(({ id }) => visibleNeighborIds.has(id));
  const visibleContext = visibleItems.filter(({ id }) => id !== focusId && !visibleNeighborIds.has(id));

  const nodes: GraphNode[] = [{ id: focus.id, label: nodeLabel(focus), x: centerX, y: centerY }];
  const innerRadiusX = Math.min(190, 115 + visibleNeighbors.length * 6);
  const innerRadiusY = Math.min(155, 95 + visibleNeighbors.length * 8);
  for (const [index, item] of visibleNeighbors.entries()) {
    const angle = (Math.PI * 2 * index) / visibleNeighbors.length - Math.PI / 2;
    nodes.push({
      id: item.id,
      label: nodeLabel(item),
      x: centerX + Math.cos(angle) * innerRadiusX,
      y: centerY + Math.sin(angle) * innerRadiusY,
    });
  }
  for (const [index, item] of visibleContext.entries()) {
    const angle = (Math.PI * 2 * index) / visibleContext.length - Math.PI / 2;
    nodes.push({
      id: item.id,
      label: nodeLabel(item),
      x: centerX + Math.cos(angle) * 390,
      y: centerY + Math.sin(angle) * 245,
    });
  }

  return { nodes, edges: mapEdges(visibleEdges, nodes) };
}
