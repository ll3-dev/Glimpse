import { useState, useCallback } from 'react';
import type { KnowledgeItem } from '@glimpse/shared';
import { ReviewCard } from './ReviewCard';
import { cn } from '@/lib/utils';

interface ReviewDeckProps {
  items: KnowledgeItem[];
  onRemembered: (item: KnowledgeItem) => Promise<void>;
  onForgotten?: (item: KnowledgeItem) => Promise<void>;
  onPostponed: (item: KnowledgeItem) => Promise<void>;
}

export function ReviewDeck({ items, onRemembered, onForgotten, onPostponed }: ReviewDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentItem = items[currentIndex];
  const total = items.length;

  const advance = useCallback(() => {
    setAnimating(true);
    setError(null);
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setAnimating(false);
    }, 200);
  }, []);

  const runAction = useCallback(
    async (item: KnowledgeItem, action: (item: KnowledgeItem) => Promise<void>) => {
      setSaving(true);
      setError(null);
      try {
        // DB 기록이 실패하면 카드를 넘기지 않는다 — 사용자가 검토
        // 완료로 오인하는 것을 방지한다.
        await action(item);
        advance();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
    },
    [advance],
  );

  const handleRemembered = useCallback(
    (item: KnowledgeItem) => runAction(item, onRemembered),
    [runAction, onRemembered],
  );

  const handleForgotten = useCallback(
    (item: KnowledgeItem) =>
      onForgotten ? runAction(item, onForgotten) : Promise.resolve(),
    [runAction, onForgotten],
  );

  const handlePostponed = useCallback(
    (item: KnowledgeItem) => runAction(item, onPostponed),
    [runAction, onPostponed],
  );

  if (!currentItem) {
    if (error) {
      return (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Progress indicator */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-1.5 w-40 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
        <span className="tabular-nums font-medium">
          {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Save error — 카드가 넘어가지 않았음을 알린다 */}
      {error && (
        <div className="w-full rounded-md bg-destructive/10 px-3 py-2">
          <p className="text-sm text-destructive">저장 실패: {error}</p>
        </div>
      )}

      {/* Card with fade transition */}
      <div
        className={cn(
          'w-full transition-opacity duration-200',
          animating ? 'opacity-0' : 'opacity-100',
        )}
      >
        <ReviewCard
          item={currentItem}
          onRemembered={handleRemembered}
          onForgotten={onForgotten ? handleForgotten : undefined}
          onPostponed={handlePostponed}
          saving={saving}
        />
      </div>

      {saving && (
        <p className="text-xs text-muted-foreground">저장 중...</p>
      )}
    </div>
  );
}
