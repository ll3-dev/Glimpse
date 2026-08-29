import { memo } from 'react';
import type { KnowledgeItem } from '@glimpse/shared';
import {
  BookOpen,
  Link as LinkIcon,
  Highlighter,
  Camera,
  Share2,
  Calendar,
  Tag,
} from 'lucide-react';
import { formatKnowledgeLabel, getDisplayLabels } from '@/features/labeling';

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

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '어제';
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

interface KnowledgeItemCardProps {
  item: KnowledgeItem;
  onClick: (id: string) => void;
}

function KnowledgeItemCardImpl({ item, onClick }: KnowledgeItemCardProps) {
  const typeInfo = TYPE_CONFIG[item.type] ?? {
    label: item.type,
    icon: BookOpen,
    badgeClass: 'bg-muted text-muted-foreground border-border',
  };
  const TypeIcon = typeInfo.icon;
  const preview =
    item.title || item.body?.slice(0, 140) || item.summary?.slice(0, 140) || '제목 없음';
  const displayLabels = getDisplayLabels(item);

  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className="group w-full rounded-xl border border-border bg-card p-4 text-left transition-all duration-150 hover:border-foreground/20 hover:bg-muted/30 hover:shadow-2xs active:scale-[0.995]"
    >
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50 text-muted-foreground transition-colors group-hover:text-foreground">
          <TypeIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${typeInfo.badgeClass}`}
            >
              {typeInfo.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 text-muted-foreground/70" />
              {formatDate(item.createdAt)}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {preview}
          </p>
          {item.tags && item.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-tag-neutral-bg px-2 py-0.5 text-[11px] font-medium text-tag-neutral-text transition-colors"
                >
                  <Tag className="h-2.5 w-2.5 opacity-70" />
                  {tag}
                </span>
              ))}
              {item.tags.length > 4 && (
                <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  +{item.tags.length - 4}
                </span>
              )}
            </div>
          )}
          {displayLabels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {displayLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-md border border-border bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {formatKnowledgeLabel(label)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/** 리스트 전체 재렌더(검색 입력·쿼리 무효화)에서 바뀌지 않은 카드의
 * 라벨 계산·포맷을 건너뛴다. */
export const KnowledgeItemCard = memo(
  KnowledgeItemCardImpl,
  (prev, next) => prev.item === next.item && prev.onClick === next.onClick,
);
