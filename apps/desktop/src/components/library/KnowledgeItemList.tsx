import { BookOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KnowledgeItem } from '@glimpse/shared';
import { KnowledgeItemCard } from './KnowledgeItemCard';
import { Skeleton } from '@/components/ui/skeleton';

interface KnowledgeItemListProps {
  items: KnowledgeItem[];
  isLoading: boolean;
  onItemClick: (id: string) => void;
}

/** First paint renders this many cards; scrolling near the bottom appends more. */
const INITIAL_VISIBLE_COUNT = 30;
const INCREMENT = 30;
/** Start loading the next chunk this many pixels before the list bottom. */
const LOAD_MORE_THRESHOLD_PX = 600;

export function KnowledgeItemList({ items, isLoading, onItemClick }: KnowledgeItemListProps) {
  // Windowed rendering: the library query returns the whole collection, and
  // mounting thousands of cards at once dominates first paint. A search query
  // shrinks `items` below the window anyway, so this only helps the unfiltered
  // browse case.
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [renderedLength, setRenderedLength] = useState(items.length);
  if (renderedLength !== items.length) {
    // A fresh result set must not keep a stale window (React's
    // adjust-state-when-props-change pattern; re-render is immediate).
    setRenderedLength(items.length);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + INCREMENT, items.length));
        }
      },
      { rootMargin: `${LOAD_MORE_THRESHOLD_PX}px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, items.length]);

  if (isLoading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/80 bg-card p-4">
            <div className="flex items-start gap-3.5">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-12 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/3 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-muted/60 text-muted-foreground shadow-2xs">
          <BookOpen className="h-6 w-6 opacity-70" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">저장된 지식이 없습니다</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          새 기록 버튼을 눌러 첫 번째 지식을 캡처해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.slice(0, visibleCount).map((item) => (
        <KnowledgeItemCard key={item.id} item={item} onClick={onItemClick} />
      ))}
      {visibleCount < items.length && <div ref={sentinelRef} aria-hidden="true" />}
    </div>
  );
}
