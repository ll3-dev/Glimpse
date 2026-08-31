import type { GraphDiscovery } from '@glimpse/features';
import { ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GraphDiscoveryCardProps = {
  discovery: GraphDiscovery;
  onOpenItem: (itemId: string) => void;
  onFocus: (itemId: string) => void;
};

function titleOf(item: GraphDiscovery['itemA']): string {
  return item.title?.trim() || item.summary?.trim() || item.body?.trim() || '제목 없는 지식';
}

export function GraphDiscoveryCard({
  discovery,
  onOpenItem,
  onFocus,
}: GraphDiscoveryCardProps) {
  const isNew = discovery.kind === 'new';

  return (
    <section className="mb-4 flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-2xs">
      <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-foreground">
        <Sparkles className="h-4 w-4" />
        오늘의 발견
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-foreground">
          {[discovery.itemA, discovery.itemB].map((item, index) => (
            <span key={item.id} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? <span className="shrink-0 text-muted-foreground">↔</span> : null}
              <button
                type="button"
                onClick={() => onOpenItem(item.id)}
                className="truncate rounded px-1 py-0.5 text-left hover:bg-muted/60"
              >
                {titleOf(item)}
              </button>
            </span>
          ))}
          <span className="ml-1 shrink-0 rounded-md bg-tag-lavender-bg px-1.5 py-0.5 text-[10px] font-medium text-tag-lavender-text">
            {isNew ? '새 연결' : '최근 연결'}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {discovery.recommendation.reason?.trim() || '두 지식의 공통 맥락을 확인해 보세요.'}
        </p>
      </div>

      <Button className="shrink-0" variant="ghost" size="sm" onClick={() => onFocus(discovery.itemA.id)}>
        그래프에서 보기
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </section>
  );
}
