import { useEffect, useRef } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';
import { useCoreClient, useKnowledgeItemsQuery } from '@glimpse/hooks';
import { generateKnowledgeGraph } from '@/features/graph/generate-knowledge-graph';

const GRAPH_DIGEST_KEY = 'glimpse_graph_source_digest_v1';
const GRAPH_FAILURE_KEY = 'glimpse_graph_failure_backoff_v1';
/** Match generate-knowledge-graph: only the newest MAX_ITEMS feed the graph. */
const GRAPH_INPUT_ITEMS = 24;
const FAILURE_BACKOFF_MS = 15 * 60_000;

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
    // The digest must reflect the exact slice the generator consumes —
    // otherwise edits outside the window trigger pointless recomputation.
    const windowed = [...items]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, GRAPH_INPUT_ITEMS);
    const digest = windowed
      .map((item) => `${item.id}:${item.updatedAt}`)
      .sort()
      .join('|');
    if (localStorage.getItem(GRAPH_DIGEST_KEY) === digest) return;
    // After a failed generation, wait out the backoff before retrying the
    // same input instead of re-running the LLM on every sync tick.
    const failedAt = Number(localStorage.getItem(GRAPH_FAILURE_KEY) ?? 0);
    if (Date.now() - failedAt < FAILURE_BACKOFF_MS) return;

    const timeout = window.setTimeout(() => {
      running.current = true;
      void generateKnowledgeGraph(coreClient, items)
        .then(() => {
          localStorage.setItem(GRAPH_DIGEST_KEY, digest);
          localStorage.removeItem(GRAPH_FAILURE_KEY);
          return queryClient.invalidateQueries({ queryKey: ['recommendations'] });
        })
        .catch(() => {
          localStorage.setItem(GRAPH_FAILURE_KEY, String(Date.now()));
        })
        .finally(() => {
          running.current = false;
        });
    }, 1_000);
    return () => window.clearTimeout(timeout);
  }, [coreClient, items, queryClient]);
}
