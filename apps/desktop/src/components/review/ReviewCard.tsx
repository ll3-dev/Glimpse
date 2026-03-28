import type { KnowledgeItem } from '@glimpse/shared';
import { Brain, Clock, Tag, Calendar, CheckCircle, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReviewCardProps {
  item: KnowledgeItem;
  onRemembered: (item: KnowledgeItem) => void;
  onPostponed: (item: KnowledgeItem) => void;
}

function formatDate(ts: number | null): string {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(text: string | null, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

const typeBadgeColors: Record<string, string> = {
  note: 'bg-blue-100 text-blue-700',
  link: 'bg-violet-100 text-violet-700',
  highlight: 'bg-amber-100 text-amber-700',
  screenshot: 'bg-rose-100 text-rose-700',
  share: 'bg-emerald-100 text-emerald-700',
};

export function ReviewCard({ item, onRemembered, onPostponed }: ReviewCardProps) {
  const badgeColor = typeBadgeColors[item.type] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col gap-5 w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-tight text-foreground">
          {item.title ?? 'Untitled'}
        </h3>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0',
            badgeColor,
          )}
        >
          <Brain className="size-3" />
          {item.type}
        </span>
      </div>

      {/* Body preview */}
      {item.body && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
          {truncate(item.body, 300)}
        </p>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              <Tag className="size-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Review info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
        <span className="inline-flex items-center gap-1">
          <Calendar className="size-3" />
          Last: {formatDate(item.lastReviewedAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          Next: {formatDate(item.nextReviewAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button
          variant="default"
          size="lg"
          className="flex-1 gap-2"
          onClick={() => onRemembered(item)}
        >
          <CheckCircle className="size-4" />
          Remembered
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="flex-1 gap-2"
          onClick={() => onPostponed(item)}
        >
          <Pause className="size-4" />
          Postponed
        </Button>
      </div>
    </div>
  );
}
