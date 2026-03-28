import { useMemo, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  useRecommendationsQuery,
  useKnowledgeItemsQuery,
  useRespondToRecommendationMutation,
} from '@glimpse/hooks';
import type { RecommendationStatus, FeedbackActionType } from '@glimpse/shared';
import { Sparkles } from 'lucide-react';
import { DigestList } from '@/components/digest/DigestList';

function DigestScreen() {
  const { data: recommendations = [], isLoading: recsLoading } = useRecommendationsQuery();
  const { data: items = [], isLoading: itemsLoading } = useKnowledgeItemsQuery();
  const respondMutation = useRespondToRecommendationMutation();

  const itemMap = useMemo(() => {
    const map = new Map<string, (typeof items)[number]>();
    for (const item of items) {
      map.set(item.id, item);
    }
    return map;
  }, [items]);

  const handleRespond = useCallback(
    (recommendationId: string, status: RecommendationStatus, action: FeedbackActionType) => {
      respondMutation.mutate({
        recommendationId,
        status,
        feedbackEvent: {
          id: crypto.randomUUID(),
          recommendationId,
          action,
          createdAt: Date.now(),
        },
      });
    },
    [respondMutation],
  );

  const handleAccept = useCallback(
    (id: string) => handleRespond(id, 'accepted', 'accept'),
    [handleRespond],
  );

  const handleIgnore = useCallback(
    (id: string) => handleRespond(id, 'ignored', 'ignore'),
    [handleRespond],
  );

  const handleDismiss = useCallback(
    (id: string) => handleRespond(id, 'dismissed', 'dismiss'),
    [handleRespond],
  );

  const isLoading = recsLoading || itemsLoading;

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 mb-3">
            <Sparkles className="size-3.5" />
            Knowledge Connections
          </div>
          <h1 className="text-2xl font-bold text-foreground">Digest</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review recommendations and discover connections between your knowledge.
          </p>
        </div>

        {/* Content */}
        <DigestList
          recommendations={recommendations}
          itemMap={itemMap}
          onAccept={handleAccept}
          onIgnore={handleIgnore}
          onDismiss={handleDismiss}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/digest')({
  component: DigestScreen,
});
