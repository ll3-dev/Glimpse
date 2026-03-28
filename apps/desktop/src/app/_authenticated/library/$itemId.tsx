import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useCoreClient } from '@glimpse/hooks';
import { queryKeys } from '@glimpse/hooks';
import { KnowledgeItemDetail } from '@/components/library/KnowledgeItemDetail';

function LibraryItemPage() {
  const { itemId } = Route.useParams();
  const coreClient = useCoreClient();
  const navigate = useNavigate();

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

  return <KnowledgeItemDetail item={item} onBack={() => navigate({ to: '/library' })} />;
}

export const Route = createFileRoute('/_authenticated/library/$itemId')({
  component: LibraryItemPage,
});
