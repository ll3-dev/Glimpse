import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCoreClient } from '@glimpse/hooks';
import { queryKeys } from '@glimpse/hooks';
import { KnowledgeItemDetail } from '@/components/library/KnowledgeItemDetail';
import { recordDesktopGraphItemDetailOpened } from '@/features/graph/graph-metrics.store';

function LibraryItemPage() {
  const { itemId } = Route.useParams();
  const coreClient = useCoreClient();
  const navigate = useNavigate();

  // 항목 상세 열기 = revisit 여정 이벤트(해시만 저장).
  useEffect(() => {
    if (itemId) recordDesktopGraphItemDetailOpened(itemId);
  }, [itemId]);

  const { data: item, isLoading } = useQuery({
    queryKey: queryKeys.knowledgeItems.detail(itemId),
    queryFn: () => coreClient.getKnowledgeItemById(itemId),
    enabled: !!itemId,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Item not found</p>
        <button
          onClick={() => navigate({ to: '/library' })}
          className="text-sm text-primary hover:underline"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <KnowledgeItemDetail
      item={item}
      onBack={() => navigate({ to: '/library' })}
      onOpenGraph={() => navigate({ to: '/graph', search: { focus: item.id } })}
    />
  );
}

export const Route = createFileRoute('/_authenticated/library/$itemId')({
  component: LibraryItemPage,
});
