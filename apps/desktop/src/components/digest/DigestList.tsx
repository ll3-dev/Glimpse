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
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs animate-pulse">
      <div className="h-4 w-2/3 rounded-md bg-muted mb-3.5" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2">
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2">
          <div className="h-3 w-12 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-8 flex-1 rounded-lg bg-muted" />
        <div className="h-8 flex-1 rounded-lg bg-muted" />
        <div className="h-8 flex-1 rounded-lg bg-muted" />
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
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-muted/60 text-muted-foreground shadow-2xs">
          <Sparkles className="h-6 w-6 opacity-70" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">추천할 연결이 없습니다</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          새로운 지식을 더 기록하면 AI가 지식 간의 유의미한 연결을 찾아 추천합니다.
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
