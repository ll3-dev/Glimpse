import { useEffect, useRef } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';
import { useCoreClient, useKnowledgeItemsQuery } from '@glimpse/hooks';
import { generateKnowledgeGraph } from '@/features/graph/generate-knowledge-graph';

const GRAPH_DIGEST_KEY = 'glimpse_graph_source_digest_v1';

export function useKnowledgeGraphAutomation() {
  const coreClient = useCoreClient();
  const queryClient = useQueryClient();
  const { data: items = [] } = useKnowledgeItemsQuery();
  const running = useRef(false);

  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | undefined;
    void listen('glimpse://sync-complete', () => {
      void queryClient.invalidateQueries();
    }).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    }).catch(() => undefined);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [queryClient]);

  useEffect(() => {
    if (items.length < 2 || running.current) return;
    const digest = items
      .map((item) => `${item.id}:${item.updatedAt}`)
      .sort()
      .join('|');
    if (localStorage.getItem(GRAPH_DIGEST_KEY) === digest) return;

    const timeout = window.setTimeout(() => {
      running.current = true;
      void generateKnowledgeGraph(coreClient, items)
        .then(() => {
          localStorage.setItem(GRAPH_DIGEST_KEY, digest);
          return queryClient.invalidateQueries({ queryKey: ['recommendations'] });
        })
        .catch(() => undefined)
        .finally(() => {
          running.current = false;
        });
    }, 1_000);
    return () => window.clearTimeout(timeout);
  }, [coreClient, items, queryClient]);
}
