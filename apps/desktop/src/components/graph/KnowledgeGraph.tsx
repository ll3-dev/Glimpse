import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import { Network, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { layoutGraph } from '@/features/graph/layout';

interface KnowledgeGraphProps {
  items: KnowledgeItem[];
  recommendations: Recommendation[];
  isLoading: boolean;
}

const NODE_COLORS = [
  '#2383e2', // Sky / Primary
  '#1a7f37', // Mint
  '#a04100', // Amber
  '#6e3ab7', // Lavender
  '#cf222e', // Rose
] as const;

export function KnowledgeGraph({ items, recommendations, isLoading }: KnowledgeGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { nodes, edges } = useMemo(
    () => layoutGraph(items, recommendations),
    [items, recommendations],
  );
  // Nodes without any edge render smaller; precompute the set once instead of
  // scanning every edge per node (O(nodes × edges)).
  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of edges) {
      ids.add(edge.source.id);
      ids.add(edge.target.id);
    }
    return ids;
  }, [edges]);

  // Selection highlight: incident edges stay vivid, everything else dims.
  const selection = useMemo(() => {
    if (!selectedNodeId) return null;
    const connected = new Set<string>([selectedNodeId]);
    const edgeState = new Map<string, 'active' | 'dimmed'>(
      edges.map((edge) => [edge.id, 'dimmed' as const]),
    );
    for (const edge of edges) {
      const otherId =
        edge.source.id === selectedNodeId ? edge.target.id : edge.target.id === selectedNodeId ? edge.source.id : null;
      if (otherId) {
        connected.add(otherId);
        edgeState.set(edge.id, 'active');
      }
    }
    return { connected, edgeState };
  }, [selectedNodeId, edges]);

  const selectedNode = selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) : null;
  const clearSelection = () => setSelectedNodeId(null);

  if (isLoading) {
    return <div className="h-[560px] animate-pulse rounded-2xl border border-border/80 bg-card shadow-2xs" />;
  }
  if (items.length === 0) {
    return (
      <div className="flex h-[480px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card text-center shadow-2xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-muted/60 text-muted-foreground shadow-2xs mb-3">
          <Network className="h-6 w-6 opacity-70" />
        </div>
        <p className="font-semibold text-foreground">연결할 지식이 아직 없습니다</p>
        <p className="mt-1 text-xs text-muted-foreground">자료를 저장하면 지식 그래프가 자동으로 생성됩니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
      {selectedNode && (
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-5 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-foreground">
            <span className="font-semibold">{selectedNode.label}</span>
            <span className="text-muted-foreground">· 연결 {(selection?.connected.size ?? 1) - 1}개</span>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="선택 해제"
          >
            <X className="h-3.5 w-3.5" />
          </button>
   </div>
      )}
      <svg
        viewBox="0 0 1000 640"
        className="min-h-[500px] w-full"
        role="img"
        aria-label={`${nodes.length}개 지식과 ${edges.length}개 연결의 지식 그래프`}
      >
        <g className="stroke-border/80">
          {edges.map((edge) => {
            const edgeMode = selection?.edgeState.get(edge.id) ?? 'idle';
            const className =
              edgeMode === 'active'
                ? 'stroke-foreground/70'
                : edgeMode === 'dimmed'
                  ? 'stroke-border/40 opacity-30'
                  : 'opacity-70 hover:opacity-100';
            return (
              <line
                key={edge.id}
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                strokeWidth={edgeMode === 'active' ? '2.5' : '1.5'}
                className={className}
              >
                {edge.reason && <title>{edge.reason}</title>}
              </line>
            );
          })}
        </g>
        {nodes.map((node, index) => {
          const isSelected = node.id === selectedNodeId;
          const isNeighbor = selection?.connected.has(node.id) ?? false;
          const dimmed = selection != null && !isNeighbor;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x} ${node.y})`}
              className="cursor-pointer group"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedNodeId((current) => (current === node.id ? null : node.id));
              }}
            >
              <circle
                r={connectedNodeIds.has(node.id) ? 24 : 18}
                className={
                  isSelected
                    ? 'fill-card stroke-foreground stroke-2'
                    : dimmed
                      ? 'fill-card stroke-border/50 opacity-40'
                      : 'fill-card stroke-border/90 group-hover:stroke-foreground/40 transition-colors'
                }
                strokeWidth="1.5"
              />
              <circle
                r="6"
                fill={NODE_COLORS[index % NODE_COLORS.length]}
                className={dimmed ? 'opacity-40' : undefined}
              />
              <text
                y="36"
                textAnchor="middle"
                className={
                  dimmed
                    ? 'fill-muted-foreground/50 text-[12px] font-medium tracking-tight select-none'
                    : 'fill-foreground text-[12px] font-medium tracking-tight select-none'
                }
              >
                {truncate(node.label, 16)}
                <title>{node.label}</title>
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="font-medium text-foreground">{nodes.length}개의 지식 노드</span>
          <span>·</span>
          <span>{edges.length}개의 연결</span>
        </div>
        <span>
          {selectedNodeId
            ? '선택한 노드의 연결과 근거(연결선 hover)를 확인할 수 있습니다.'
            : '노드를 클릭하면 연결이 강조되고, 연결선에 마우스를 올리면 근거를 볼 수 있습니다.'}
        </span>
      </div>
    </div>
  );
}

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}
