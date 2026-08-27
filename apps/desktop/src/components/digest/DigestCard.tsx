import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import { Tag, Sparkles, CheckCircle, XCircle, SkipForward } from 'lucide-react';
import { memo } from 'react';
import { Button } from '@/components/ui/button';

interface DigestCardProps {
  recommendation: Recommendation;
  itemA: KnowledgeItem | undefined;
  itemB: KnowledgeItem | undefined;
  onAccept: (recommendationId: string) => void;
  onIgnore: (recommendationId: string) => void;
  onDismiss: (recommendationId: string) => void;
}

function sharedTags(a: KnowledgeItem | undefined, b: KnowledgeItem | undefined): string[] {
  if (!a?.tags || !b?.tags) return [];
  const setB = new Set(b.tags);
  return a.tags.filter((tag) => setB.has(tag));
}

function ItemPreview({ item, label }: { item: KnowledgeItem | undefined; label: string }) {
  if (!item) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        {label} not found
      </div>
    );
  }

  const title = item.title ?? 'Untitled';
  const body = item.body
    ? item.body.length > 120
      ? item.body.slice(0, 120) + '...'
      : item.body
    : null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {item.type}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
      {body && <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              <Tag className="size-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * memo 카드 — 응답 mutation이 recommendations 쿼리를 무효화해도 남은 카드는
 * 프롭이 동일하므로 재렌더를 건너뛴다. 콜백들은 호출부에서 useCallback으로
 * 안정화돼 있다.
 */
export const DigestCard = memo(function DigestCard({
  recommendation,
  itemA,
  itemB,
  onAccept,
  onIgnore,
  onDismiss,
}: DigestCardProps) {
  const shared = sharedTags(itemA, itemB);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col gap-4">
      {/* Reason */}
      {recommendation.reason && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 mt-0.5 shrink-0 text-amber-500" />
          <p>{recommendation.reason}</p>
        </div>
      )}

      {/* Shared tags */}
      {shared.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shared.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"
            >
              <Tag className="size-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Items side by side */}
      <div className="grid grid-cols-2 gap-3">
        <ItemPreview item={itemA} label="Item A" />
        <ItemPreview item={itemB} label="Item B" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="default"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => onAccept(recommendation.id)}
        >
          <CheckCircle className="size-3.5" />
          Accept
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => onIgnore(recommendation.id)}
        >
          <XCircle className="size-3.5" />
          Ignore
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => onDismiss(recommendation.id)}
        >
          <SkipForward className="size-3.5" />
          Dismiss
        </Button>
      </div>
    </div>
  );
});
