import { useMemo, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  useRecommendationsQuery,
  useKnowledgeItemsQuery,
  useRespondToRecommendationMutation,
  useCoreClient,
  queryKeys,
} from '@glimpse/hooks';
import type { RecommendationStatus, FeedbackActionType } from '@glimpse/shared';
import { Sparkles } from 'lucide-react';
import { DigestList } from '@/components/digest/DigestList';
import { RecentEdgesSection } from '@/components/digest/RecentEdgesSection';
import { selectRecentEdges } from '@/features/digest/recent-edges';

function DigestScreen() {
  const { data: recommendations = [], isLoading: recsLoading } = useRecommendationsQuery();
  const { data: items = [], isLoading: itemsLoading } = useKnowledgeItemsQuery();
  const respondMutation = useRespondToRecommendationMutation();
  const coreClient = useCoreClient();
  const { data: allEdges = [] } = useQuery({
    queryKey: queryKeys.recommendations.graph,
    queryFn: () => coreClient.listRecommendations(),
  });

  const recentEdges = useMemo(
    () => selectRecentEdges(allEdges.filter((edge) => edge.status === 'accepted'), items),
    [allEdges, items],
  );

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
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-5xl">
        {/* Page header */}
        <div className="mb-8 border-b border-border/80 pb-5">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-md bg-tag-lavender-bg px-2.5 py-1 text-xs font-medium text-tag-lavender-text">
            <Sparkles className="h-3.5 w-3.5" />
            지식 연결 (Knowledge Connections)
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">다이제스트</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            저장된 지식 간의 숨겨진 연결과 추천을 발견하고 검토합니다.
          </p>
        </div>

        {/* Recent accepted connections */}
        <RecentEdgesSection edges={recentEdges} />

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
