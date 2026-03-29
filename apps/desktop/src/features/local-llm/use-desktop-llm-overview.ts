import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDesktopLLMOverview,
  type DesktopLLMOverview,
} from './desktop-llm-service';

export const llmQueryKeys = {
  overview: ['llm', 'overview'] as const,
  health: ['llm', 'health'] as const,
  models: ['llm', 'models'] as const,
  runtimes: ['llm', 'runtimes'] as const,
};

export function useDesktopLLMOverview() {
  return useQuery<DesktopLLMOverview>({
    queryKey: llmQueryKeys.overview,
    queryFn: getDesktopLLMOverview,
    staleTime: 30_000, // 30 seconds - health changes infrequently
    refetchInterval: 60_000, // Refresh health every minute
    refetchOnWindowFocus: true,
  });
}

export function useInvalidateLLMOverview() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: llmQueryKeys.overview });
  };
}
