import { useState, useCallback } from 'react';
import type { KnowledgeItem } from '@glimpse/shared';
import { ReviewCard } from './ReviewCard';
import { cn } from '@/lib/utils';

interface ReviewDeckProps {
  items: KnowledgeItem[];
  onRemembered: (item: KnowledgeItem) => void;
  onPostponed: (item: KnowledgeItem) => void;
}

export function ReviewDeck({ items, onRemembered, onPostponed }: ReviewDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  const currentItem = items[currentIndex];
  const total = items.length;

  const advance = useCallback(() => {
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setAnimating(false);
    }, 200);
  }, []);

  const handleRemembered = useCallback(
    (item: KnowledgeItem) => {
      onRemembered(item);
      advance();
    },
    [onRemembered, advance],
  );

  const handlePostponed = useCallback(
    (item: KnowledgeItem) => {
      onPostponed(item);
      advance();
    },
    [onPostponed, advance],
  );

  if (!currentItem) return null;

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
          onPostponed={handlePostponed}
        />
      </div>
    </div>
  );
}
