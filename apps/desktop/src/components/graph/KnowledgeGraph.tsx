import { useMemo, useState } from 'react';
import { Network, X } from 'lucide-react';
import type { FeedbackActionType, KnowledgeItem, Recommendation } from '@glimpse/shared';
import { layoutFocusedGraph, layoutGraph } from '@glimpse/shared';
import { Button } from '@/components/ui/button';
import { GraphCanvas } from './GraphCanvas';
import { GraphEdgeInspector } from './GraphEdgeInspector';

type KnowledgeGraphProps = {
  items: KnowledgeItem[];
  recommendations: Recommendation[];
  isLoading: boolean;
  focusedNodeId: string | null;
  isResponding: boolean;
  onFocusChange: (nodeId: string | null) => void;
  onOpenItem: (itemId: string) => void;
  onRespond: (recommendationId: string, action: FeedbackActionType) => void;
};

export function KnowledgeGraph({
  items,
  recommendations,
  isLoading,
  focusedNodeId,
  isResponding,
  onFocusChange,
  onOpenItem,
  onRespond,
}: KnowledgeGraphProps) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const { nodes, edges } = useMemo(
    () => focusedNodeId
      ? layoutFocusedGraph(items, recommendations, focusedNodeId)
      : layoutGraph(items, recommendations),
    [focusedNodeId, items, recommendations],
  );
  const focusedNode = focusedNodeId ? nodes.find(({ id }) => id === focusedNodeId) : null;
  const focusedConnectionCount = focusedNodeId
    ? edges.filter(({ source, target }) => source.id === focusedNodeId || target.id === focusedNodeId).length
    : 0;
  const selectedEdge = selectedEdgeId ? edges.find(({ id }) => id === selectedEdgeId) : null;
  const activeEdgeId = selectedEdge?.id ?? null;
  const selectedRecommendation = activeEdgeId
    ? recommendations.find(({ id }) => id === activeEdgeId)
    : undefined;

  if (isLoading) {
    return <div className="h-[560px] animate-pulse rounded-2xl border border-border/80 bg-card shadow-2xs" />;
  }
  if (items.length === 0) {
    return (
      <div className="flex h-[480px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card text-center shadow-2xs">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-muted/60 text-muted-foreground shadow-2xs">
          <Network className="h-6 w-6 opacity-70" />
        </div>
        <p className="font-semibold text-foreground">연결할 지식이 아직 없습니다</p>
        <p className="mt-1 text-xs text-muted-foreground">자료를 저장하면 지식 그래프가 자동으로 생성됩니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
      {focusedNode ? (
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-5 py-2.5 text-xs">
          <div className="flex min-w-0 items-center gap-2 text-foreground">
            <span className="truncate font-semibold">{focusedNode.label}</span>
            <span className="shrink-0 text-muted-foreground">· 연결 {focusedConnectionCount}개</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => onOpenItem(focusedNode.id)}>상세 보기</Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onFocusChange(null)} aria-label="선택 해제">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      <GraphCanvas
        nodes={nodes}
        edges={edges}
        focusedNodeId={focusedNodeId}
        selectedEdgeId={activeEdgeId}
        onFocusNode={(nodeId) => {
          onFocusChange(focusedNodeId === nodeId ? null : nodeId);
          setSelectedEdgeId(null);
        }}
        onSelectEdge={(edgeId) => setSelectedEdgeId((current) => current === edgeId ? null : edgeId)}
      />

      {selectedEdge ? (
        <GraphEdgeInspector
          edge={selectedEdge}
          recommendation={selectedRecommendation}
          isResponding={isResponding}
          onOpenItem={onOpenItem}
          onAccept={() => onRespond(selectedEdge.id, 'accept')}
          onIgnore={() => onRespond(selectedEdge.id, 'ignore')}
          onDismiss={() => onRespond(selectedEdge.id, 'dismiss')}
          onClose={() => setSelectedEdgeId(null)}
        />
      ) : null}

      <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="font-medium text-foreground">{nodes.length}개의 지식 노드</span>
          <span>·</span>
          <span>{edges.length}개의 연결</span>
        </div>
        <span>{focusedNodeId ? '중심 지식의 1-hop 연결을 우선 표시합니다.' : '노드 또는 연결선을 선택해 주변 맥락과 근거를 확인하세요.'}</span>
      </div>
    </div>
  );
}
