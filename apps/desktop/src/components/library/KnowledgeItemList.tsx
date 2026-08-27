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
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20 rounded" />
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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4">
          <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h3 className="mt-4 text-sm font-medium">No items found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture your first knowledge item to get started.
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
