import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import { Network } from 'lucide-react';
import { useMemo } from 'react';
import { layoutGraph } from '@/features/graph/layout';

interface KnowledgeGraphProps {
  items: KnowledgeItem[];
  recommendations: Recommendation[];
  isLoading: boolean;
}

const NODE_COLORS = [
  'fill-chart-1',
  'fill-chart-2',
  'fill-chart-3',
  'fill-chart-4',
  'fill-chart-5',
] as const;

export function KnowledgeGraph({ items, recommendations, isLoading }: KnowledgeGraphProps) {
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

  if (isLoading) {
    return <div className="h-[620px] animate-pulse rounded-xl border border-border bg-card" />;
  }
  if (items.length === 0) {
    return (
      <div className="flex h-[520px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card text-center">
        <Network className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium text-foreground">연결할 지식이 아직 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">자료를 저장하면 그래프가 자동으로 만들어집니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <svg
        viewBox="0 0 1000 660"
        className="min-h-[520px] w-full"
        role="img"
        aria-label={`${nodes.length}개 지식과 ${edges.length}개 연결의 지식 그래프`}
      >
        <g className="stroke-border">
          {edges.map((edge) => (
            <line
              key={edge.id}
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              strokeWidth="2"
              className="opacity-80"
            >
              {edge.reason && <title>{edge.reason}</title>}
            </line>
          ))}
        </g>
        {nodes.map((node, index) => (
          <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
            <circle
              r={connectedNodeIds.has(node.id) ? 25 : 20}
              className="fill-card stroke-border"
              strokeWidth="2"
            />
            <circle r="8" className={NODE_COLORS[index % NODE_COLORS.length]} />
            <text
              y="39"
              textAnchor="middle"
              className="fill-foreground text-[13px] font-medium"
            >
              {truncate(node.label, 18)}
              <title>{node.label}</title>
            </text>
          </g>
        ))}
      </svg>
      <div className="flex gap-5 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span>{nodes.length} nodes</span>
        <span>{edges.length} connections</span>
        <span className="ml-auto">연결선에 마우스를 올리면 생성 이유를 확인할 수 있습니다.</span>
      </div>
    </div>
  );
}

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}
