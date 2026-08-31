import type { GraphEdge } from '@glimpse/shared';
import { EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GraphEdgeInspectorProps = {
  edge: GraphEdge;
  isResponding: boolean;
  onOpenItem: (itemId: string) => void;
  onHide: () => void;
  onClose: () => void;
};

export function GraphEdgeInspector({
  edge,
  isResponding,
  onOpenItem,
  onHide,
  onClose,
}: GraphEdgeInspectorProps) {
  return (
    <div className="border-t border-border bg-muted/20 px-5 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">연결 근거</p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">
            {edge.reason?.trim() || '저장된 연결 근거가 없습니다.'}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="연결 정보 닫기">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        {[edge.source, edge.target].map((node) => (
          <Button key={node.id} variant="outline" size="sm" className="min-w-0 flex-1" onClick={() => onOpenItem(node.id)}>
            <span className="truncate">{node.label}</span>
          </Button>
        ))}
        <Button variant="ghost" size="sm" disabled={isResponding} onClick={onHide}>
          <EyeOff className="h-3.5 w-3.5" /> 이 연결 숨기기
        </Button>
      </div>
    </div>
  );
}
