import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useCoreClient, useKnowledgeItemsQuery } from '@glimpse/hooks';
import { Network } from 'lucide-react';
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph';

function GraphScreen() {
  const coreClient = useCoreClient();
  const items = useKnowledgeItemsQuery();
  const recommendations = useQuery({
    queryKey: ['recommendations', 'graph'],
    queryFn: () => coreClient.listRecommendations(),
  });

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
            <Network className="h-3.5 w-3.5" />
            Desktop-generated
          </div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge Graph</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            동기화된 지식을 Desktop AI가 분석하고 연결을 자동으로 갱신합니다.
          </p>
        </div>
        <KnowledgeGraph
          items={items.data ?? []}
          recommendations={recommendations.data ?? []}
          isLoading={items.isLoading || recommendations.isLoading}
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/graph')({ component: GraphScreen });
