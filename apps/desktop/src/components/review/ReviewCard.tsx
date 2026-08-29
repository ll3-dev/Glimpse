import type { KnowledgeItem } from '@glimpse/shared';
import {
  Clock,
  Tag,
  Calendar,
  Check,
  X,
  BookOpen,
  Link as LinkIcon,
  Highlighter,
  Camera,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReviewCardProps {
  item: KnowledgeItem;
  onRemembered: (item: KnowledgeItem) => void;
  onForgotten?: (item: KnowledgeItem) => void;
  onPostponed: (item: KnowledgeItem) => void;
  /** 저장 진행 중 — 버튼 연타로 인한 DB 이중 기록/카드 스킵 방지 */
  saving?: boolean;
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

function formatDate(ts: number | null): string {
  if (!ts) return '없음';
  return new Date(ts).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

function truncate(text: string | null, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

export function ReviewCard({ item, onRemembered, onForgotten, onPostponed, saving }: ReviewCardProps) {
  const typeInfo = TYPE_CONFIG[item.type] ?? {
    label: item.type,
    icon: BookOpen,
    badgeClass: 'bg-muted text-muted-foreground border-border',
  };
  const TypeIcon = typeInfo.icon;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-border bg-card p-7 shadow-xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold leading-snug text-foreground">
          {item.title ?? '제목 없음'}
        </h3>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium ${typeInfo.badgeClass}`}
        >
          <TypeIcon className="h-3 w-3" />
          {typeInfo.label}
        </span>
      </div>

      {/* Body preview */}
      {item.body && (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {truncate(item.body, 400)}
          </p>
        </div>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-tag-neutral-bg px-2.5 py-0.5 text-xs font-medium text-tag-neutral-text"
            >
              <Tag className="h-3 w-3 opacity-70" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Review info */}
      <div className="flex items-center gap-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          마지막 복습: {formatDate(item.lastReviewedAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          다음 예정: {formatDate(item.nextReviewAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 pt-1">
        <Button
          variant="default"
          size="lg"
          className="flex-1 gap-1.5 rounded-xl bg-app-text text-app-bg shadow-2xs hover:opacity-90 active:scale-98"
          disabled={saving}
          onClick={() => onRemembered(item)}
        >
          <Check className="h-4 w-4" />
          기억남
        </Button>
        {onForgotten && (
          <Button
            variant="outline"
            size="lg"
            className="flex-1 gap-1.5 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-98"
            disabled={saving}
            onClick={() => onForgotten(item)}
          >
            <X className="h-4 w-4" />
            기억 안 남
          </Button>
        )}
        <Button
          variant="ghost"
          size="lg"
          className="flex-1 gap-1.5 rounded-xl text-muted-foreground hover:text-foreground active:scale-98"
          disabled={saving}
          onClick={() => onPostponed(item)}
        >
          <Clock className="h-4 w-4" />
          나중에
        </Button>
      </div>
    </div>
  );
}
