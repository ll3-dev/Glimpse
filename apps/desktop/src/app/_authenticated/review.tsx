import { createFileRoute } from '@tanstack/react-router';
import { useDueItemsQuery, useMarkAsReviewedMutation, usePostponeReviewMutation } from '@glimpse/hooks';
import { Brain } from 'lucide-react';
import { ReviewDeck } from '@/components/review/ReviewDeck';

function calculateNextInterval(
  currentInterval: number | null,
  feedback: 'remembered' | 'postponed',
): number {
  const defaultInterval = 24 * 60 * 60 * 1000; // 1 day
  const base = currentInterval ?? defaultInterval;
  return feedback === 'remembered' ? base * 2 : base;
}

function ReviewScreen() {
  const { data: items = [], isLoading, isError, refetch } = useDueItemsQuery();
  const markAsReviewed = useMarkAsReviewedMutation();
  const postponeReview = usePostponeReviewMutation();

  const handleRemembered = async (item: typeof items[number]) => {
    const currentInterval = item.nextReviewAt && item.lastReviewedAt
      ? item.nextReviewAt - item.lastReviewedAt
      : null;
    const nextInterval = calculateNextInterval(currentInterval, 'remembered');
    const nextReviewAt = Date.now() + nextInterval;
    await markAsReviewed.mutateAsync({ itemId: item.id, nextReviewAt });
  };

  const handlePostponed = async (item: typeof items[number]) => {
    const currentInterval = item.nextReviewAt && item.lastReviewedAt
      ? item.nextReviewAt - item.lastReviewedAt
      : null;
    const nextInterval = calculateNextInterval(currentInterval, 'postponed');
    const nextReviewAt = Date.now() + nextInterval;
    await postponeReview.mutateAsync({ itemId: item.id, nextReviewAt });
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Page header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
            <Brain className="size-3.5" />
            Spaced Repetition
          </div>
          <h1 className="text-2xl font-bold text-foreground">Review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Strengthen your memory by reviewing knowledge items.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading due items...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-destructive">Failed to load due items.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              다시 시도
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Brain className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No items due for review!
            </h3>
            <p className="text-sm text-muted-foreground">
              Great work! Check back later when more items are scheduled.
            </p>
          </div>
        ) : (
          <ReviewDeck
            items={items}
            onRemembered={handleRemembered}
            onPostponed={handlePostponed}
          />
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/review')({
  component: ReviewScreen,
});
