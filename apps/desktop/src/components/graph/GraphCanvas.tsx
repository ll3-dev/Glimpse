import type { GraphEdge, GraphNode } from '@glimpse/shared';

type GraphCanvasProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  focusedNodeId: string | null;
  selectedEdgeId: string | null;
  onFocusNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
};

const NODE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

export function GraphCanvas({
  nodes,
  edges,
  focusedNodeId,
  selectedEdgeId,
  onFocusNode,
  onSelectEdge,
}: GraphCanvasProps) {
  const connectedNodeIds = new Set<string>();
  const focusNeighborIds = new Set<string>(focusedNodeId ? [focusedNodeId] : []);
  const focusEdgeIds = new Set<string>();
  for (const edge of edges) {
    const sourceId = edge.source.id;
    const targetId = edge.target.id;
    connectedNodeIds.add(sourceId);
    connectedNodeIds.add(targetId);
    if (sourceId === focusedNodeId || targetId === focusedNodeId) {
      focusNeighborIds.add(sourceId);
      focusNeighborIds.add(targetId);
      focusEdgeIds.add(edge.id);
    }
  }
  const selectedEdge = selectedEdgeId ? edges.find(({ id }) => id === selectedEdgeId) : null;

  return (
    <svg
      viewBox="0 0 1000 640"
      className="min-h-[500px] w-full"
      role="group"
      aria-label={`${nodes.length}개 지식과 ${edges.length}개 연결의 지식 그래프`}
    >
      {edges.map((edge) => {
        const isSelected = edge.id === selectedEdge?.id;
        const isFocusEdge = focusEdgeIds.has(edge.id);
        const dimmed = selectedEdge ? !isSelected : focusedNodeId != null && !isFocusEdge;
        return (
          <g key={edge.id}>
            <line
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              strokeWidth={isSelected ? 3 : isFocusEdge ? 2.5 : 1.5}
              className={isSelected || isFocusEdge ? 'stroke-foreground/70' : dimmed ? 'stroke-border/40 opacity-30' : 'stroke-border/80 opacity-70'}
            />
            <line
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              stroke="transparent"
              strokeWidth={20}
              className="cursor-pointer"
              pointerEvents="stroke"
              tabIndex={0}
              role="button"
              aria-label={`${edge.source.label}와 ${edge.target.label} 연결 보기`}
              aria-pressed={isSelected}
              onClick={() => onSelectEdge(edge.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectEdge(edge.id);
              }}
            >
              {edge.reason ? <title>{edge.reason}</title> : null}
            </line>
          </g>
        );
      })}
      {nodes.map((node, index) => {
        const isFocused = node.id === focusedNodeId;
        const belongsToSelectedEdge =
          selectedEdge?.source.id === node.id || selectedEdge?.target.id === node.id;
        const dimmed = selectedEdge
          ? !belongsToSelectedEdge
          : focusedNodeId != null && !focusNeighborIds.has(node.id);
        return (
          <g
            key={node.id}
            transform={`translate(${node.x} ${node.y})`}
            className="group cursor-pointer outline-none"
            tabIndex={0}
            role="button"
            aria-label={`${node.label} 중심으로 그래프 보기`}
            aria-pressed={isFocused}
            onClick={() => onFocusNode(node.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onFocusNode(node.id);
            }}
          >
            <circle
              r={connectedNodeIds.has(node.id) ? 24 : 18}
              className={isFocused ? 'fill-card stroke-foreground stroke-2' : dimmed ? 'fill-card stroke-border/50 opacity-40' : 'fill-card stroke-border/90 transition-colors group-hover:stroke-foreground/40 group-focus:stroke-foreground/60'}
              strokeWidth="1.5"
            />
            <circle r="6" fill={NODE_COLORS[index % NODE_COLORS.length]} className={dimmed ? 'opacity-40' : undefined} />
            <text
              y="36"
              textAnchor="middle"
              className={dimmed ? 'select-none fill-muted-foreground/50 text-[12px] font-medium tracking-tight' : 'select-none fill-foreground text-[12px] font-medium tracking-tight'}
            >
              {truncate(node.label, 16)}
              <title>{node.label}</title>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
