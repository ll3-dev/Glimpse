import type { GraphDiscovery } from '@glimpse/features';
import { Check, ChevronRight, Clock, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GraphDiscoveryCardProps = {
  discovery: GraphDiscovery;
  isResponding: boolean;
  onOpenItem: (itemId: string) => void;
  onFocus: (itemId: string) => void;
  onAccept: () => void;
  onIgnore: () => void;
  onDismiss: () => void;
};

function titleOf(item: GraphDiscovery['itemA']): string {
  return item.title?.trim() || item.summary?.trim() || item.body?.trim() || '제목 없는 지식';
}

export function GraphDiscoveryCard({
  discovery,
  isResponding,
  onOpenItem,
  onFocus,
  onAccept,
  onIgnore,
  onDismiss,
}: GraphDiscoveryCardProps) {
  const isNew = discovery.kind === 'new';

  return (
    <section className="mb-5 rounded-xl border border-border bg-card p-4 shadow-2xs">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4" />
          오늘의 발견
        </div>
        <span className="rounded-md bg-tag-lavender-bg px-2 py-0.5 text-[10px] font-medium text-tag-lavender-text">
          {isNew ? '새 연결' : '최근 수락'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[discovery.itemA, discovery.itemB].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenItem(item.id)}
            className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted/50"
          >
            <span className="line-clamp-2">{titleOf(item)}</span>
          </button>
        ))}
      </div>

      <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {discovery.recommendation.reason?.trim() || '두 지식의 공통 맥락을 확인해 보세요.'}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onFocus(discovery.itemA.id)}>
          그래프에서 보기
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        {isNew ? (
          <div className="ml-auto flex gap-1.5">
            <Button size="icon-sm" disabled={isResponding} onClick={onAccept} aria-label="연결 수락">
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={isResponding} onClick={onIgnore} aria-label="연결 무시">
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={isResponding} onClick={onDismiss} aria-label="연결 나중에 보기">
              <Clock className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
