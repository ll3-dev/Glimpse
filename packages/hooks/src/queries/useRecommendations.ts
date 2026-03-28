import { useQuery } from '@tanstack/react-query';
import type { Recommendation } from '@glimpse/shared';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

export function useRecommendationsQuery() {
  const coreClient = useCoreClient();
  return useQuery({
    queryKey: queryKeys.recommendations.pending,
    queryFn: () => coreClient.listPendingRecommendations(),
  });
}
