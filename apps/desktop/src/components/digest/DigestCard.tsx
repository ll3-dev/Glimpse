import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import { Tag, Sparkles, Check, X, Clock, BookOpen, Link as LinkIcon, Highlighter, Camera, Share2 } from 'lucide-react';
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

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; badgeClass: string }
> = {
  note: {
    label: '메모',
    icon: BookOpen,
    badgeClass: 'bg-tag-mint-bg text-tag-mint-text border-tag-mint-text/20',
  },
  link: {
    label: '링크',
    icon: LinkIcon,
    badgeClass: 'bg-tag-sky-bg text-tag-sky-text border-tag-sky-text/20',
  },
  highlight: {
    label: '하이라이트',
    icon: Highlighter,
    badgeClass: 'bg-tag-peach-bg text-tag-peach-text border-tag-peach-text/20',
  },
  screenshot: {
    label: '스크린샷',
    icon: Camera,
    badgeClass: 'bg-tag-rose-bg text-tag-rose-text border-tag-rose-text/20',
  },
  share: {
    label: '공유',
    icon: Share2,
    badgeClass: 'bg-tag-lavender-bg text-tag-lavender-text border-tag-lavender-text/20',
  },
};

function sharedTags(a: KnowledgeItem | undefined, b: KnowledgeItem | undefined): string[] {
  if (!a?.tags || !b?.tags) return [];
  const setB = new Set(b.tags);
  return a.tags.filter((tag) => setB.has(tag));
}

function ItemPreview({ item, label }: { item: KnowledgeItem | undefined; label: string }) {
  if (!item) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 p-3 text-xs text-muted-foreground">
        {label}을(를) 찾을 수 없습니다
      </div>
    );
  }

  const typeInfo = TYPE_CONFIG[item.type] ?? {
    label: item.type,
    icon: BookOpen,
    badgeClass: 'bg-muted text-muted-foreground border-border',
  };
  const title = item.title ?? '제목 없음';
  const body = item.body
    ? item.body.length > 100
      ? item.body.slice(0, 100) + '...'
      : item.body
    : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/30 p-3.5 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={`inline-flex items-center rounded border px-1.5 py-0.2 text-[10px] font-medium ${typeInfo.badgeClass}`}>
          {typeInfo.label}
        </span>
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{title}</p>
      {body && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{body}</p>}
      {item.tags && item.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 rounded bg-tag-neutral-bg px-1.5 py-0.5 text-[10px] text-tag-neutral-text"
            >
              <Tag className="h-2.5 w-2.5 opacity-70" />
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
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-2xs">
      {/* Reason */}
      {recommendation.reason && (
        <div className="flex items-start gap-2.5 rounded-lg border border-tag-peach-text/15 bg-tag-peach-bg/40 p-3 text-xs leading-relaxed text-foreground/90">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tag-peach-text" />
          <p>{recommendation.reason}</p>
        </div>
      )}

      {/* Shared tags */}
      {shared.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">공통 태그:</span>
          {shared.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-tag-peach-bg px-2 py-0.5 text-[11px] font-medium text-tag-peach-text"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Items side by side */}
      <div className="grid grid-cols-2 gap-3">
        <ItemPreview item={itemA} label="지식 A" />
        <ItemPreview item={itemB} label="지식 B" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="default"
          size="sm"
          className="flex-1 gap-1.5 rounded-lg bg-app-text text-app-bg hover:opacity-90"
          onClick={() => onAccept(recommendation.id)}
        >
          <Check className="h-3.5 w-3.5" />
          연결 수락
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onIgnore(recommendation.id)}
        >
          <X className="h-3.5 w-3.5" />
          무시
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={() => onDismiss(recommendation.id)}
        >
          <Clock className="h-3.5 w-3.5" />
          나중에
        </Button>
      </div>
    </div>
  );
});
