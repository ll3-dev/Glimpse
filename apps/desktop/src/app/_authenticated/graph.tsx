import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  queryKeys,
  useCoreClient,
  useKnowledgeItemsQuery,
  useRespondToRecommendationMutation,
} from '@glimpse/hooks';
import { selectTodayDiscoveries } from '@glimpse/features';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';
import { Network } from 'lucide-react';
import { GraphDiscoveryCard } from '@/components/graph/GraphDiscoveryCard';
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph';
import { recordDesktopGraphDiscoveryOpen } from '@/features/graph/graph-metrics.store';

type GraphSearch = { focus?: string };

const EMPTY_ITEMS: KnowledgeItem[] = [];
const EMPTY_RECOMMENDATIONS: Recommendation[] = [];

function GraphScreen() {
  const coreClient = useCoreClient();
  const navigate = useNavigate();
  const { focus } = Route.useSearch();
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(focus ?? null);
  const respondMutation = useRespondToRecommendationMutation();
  const items = useKnowledgeItemsQuery();
  const recommendations = useQuery({
    queryKey: queryKeys.recommendations.graph,
    queryFn: () => coreClient.listRecommendations(),
  });
  const itemList = items.data ?? EMPTY_ITEMS;
  const edgeList = recommendations.data ?? EMPTY_RECOMMENDATIONS;
  const discovery = useMemo(
    () => selectTodayDiscoveries(itemList, edgeList, 1)[0],
    [edgeList, itemList],
  );

  const openItem = (itemId: string) => {
    void navigate({ to: '/library/$itemId', params: { itemId } });
  };
  const openDiscoveryItem = (itemId: string) => {
    recordDesktopGraphDiscoveryOpen();
    openItem(itemId);
  };
  const hideRecommendation = (recommendationId: string) => {
    respondMutation.mutate({
      recommendationId,
      status: 'ignored',
      feedbackEvent: {
        id: crypto.randomUUID(),
        recommendationId,
        action: 'ignore',
        createdAt: Date.now(),
      },
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 border-b border-border/80 pb-5">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-md bg-tag-sky-bg px-2.5 py-1 text-xs font-medium text-tag-sky-text">
            <Network className="h-3.5 w-3.5" />
            지식 그래프 (Knowledge Graph)
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">지식 그래프</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            동기화된 지식을 AI가 분석하여 지식 간의 유기적 연결 관계를 시각화합니다.
          </p>
        </div>
        {discovery ? (
          <GraphDiscoveryCard
            discovery={discovery}
            onOpenItem={openDiscoveryItem}
            onFocus={setFocusedNodeId}
          />
        ) : null}
        <KnowledgeGraph
          items={itemList}
          recommendations={edgeList}
          isLoading={items.isLoading || recommendations.isLoading}
          focusedNodeId={focusedNodeId}
          isResponding={respondMutation.isPending}
          onFocusChange={setFocusedNodeId}
          onOpenItem={openItem}
          onHideRecommendation={hideRecommendation}
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/graph')({
  validateSearch: (search: Record<string, unknown>): GraphSearch => ({
    focus: typeof search.focus === 'string' && search.focus.length > 0 ? search.focus : undefined,
  }),
  component: GraphScreen,
});
