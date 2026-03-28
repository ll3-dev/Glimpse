import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import { Sparkles } from 'lucide-react';
import { DigestCard } from './DigestCard';

interface DigestListProps {
  recommendations: Recommendation[];
  itemMap: Map<string, KnowledgeItem>;
  onAccept: (recommendationId: string) => void;
  onIgnore: (recommendationId: string) => void;
  onDismiss: (recommendationId: string) => void;
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm animate-pulse">
      <div className="h-4 w-2/3 rounded bg-muted mb-3" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-7 flex-1 rounded bg-muted" />
        <div className="h-7 flex-1 rounded bg-muted" />
        <div className="h-7 flex-1 rounded bg-muted" />
      </div>
    </div>
  );
}

export function DigestList({
  recommendations,
  itemMap,
  onAccept,
  onIgnore,
  onDismiss,
  isLoading,
}: DigestListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Sparkles className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No new recommendations!</h3>
        <p className="text-sm text-muted-foreground">
          Check back later for knowledge connections.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {recommendations.map((rec) => (
        <DigestCard
          key={rec.id}
          recommendation={rec}
          itemA={itemMap.get(rec.itemA_id)}
          itemB={itemMap.get(rec.itemB_id)}
          onAccept={onAccept}
          onIgnore={onIgnore}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
