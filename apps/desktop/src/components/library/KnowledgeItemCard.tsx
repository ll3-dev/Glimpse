import { memo } from 'react';
import type { KnowledgeItem } from '@glimpse/shared';
import {
  BookOpen,
  Link,
  Highlighter,
  Camera,
  Share2,
  Calendar,
  Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatKnowledgeLabel, getDisplayLabels } from '@/features/labeling';

const typeIcons: Record<string, React.ReactNode> = {
  note: <BookOpen className="h-4 w-4" />,
  link: <Link className="h-4 w-4" />,
  highlight: <Highlighter className="h-4 w-4" />,
  screenshot: <Camera className="h-4 w-4" />,
  share: <Share2 className="h-4 w-4" />,
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

interface KnowledgeItemCardProps {
  item: KnowledgeItem;
  onClick: (id: string) => void;
}

function KnowledgeItemCardImpl({ item, onClick }: KnowledgeItemCardProps) {
  const preview =
    item.title || item.body?.slice(0, 120) || item.summary?.slice(0, 120) || 'Untitled';

  return (
    <button
      onClick={() => onClick(item.id)}
      className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          {typeIcons[item.type] || <BookOpen className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {item.type}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(item.createdAt)}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-medium">{preview}</p>
          {item.tags && item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
              {item.tags.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{item.tags.length - 4}
                </span>
              )}
            </div>
          )}
          {getDisplayLabels(item).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {getDisplayLabels(item).map((label) => (
                <Badge key={label} variant="outline" className="text-[10px] px-1.5 py-0">
                  {formatKnowledgeLabel(label)}
                </Badge>
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
