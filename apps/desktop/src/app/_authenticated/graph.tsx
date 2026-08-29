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
