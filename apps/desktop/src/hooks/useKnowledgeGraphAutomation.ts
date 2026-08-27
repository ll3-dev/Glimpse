import { useEffect, useRef } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';
import { useCoreClient, useKnowledgeItemsQuery } from '@glimpse/hooks';
import { backoffDurationMs } from '@glimpse/shared';
import { generateKnowledgeGraph } from '@/features/graph/generate-knowledge-graph';
import { computeGraphSourceDigest } from '@/features/graph/graph-source-window';

const GRAPH_DIGEST_KEY = 'glimpse_graph_source_digest_v1';
const GRAPH_FAILURE_KEY = 'glimpse_graph_failure_backoff_v1';
const GRAPH_CONSECUTIVE_FAILURES_KEY = 'glimpse_graph_consecutive_failures_v1';
/** After this many consecutive failures, stop auto-retrying until manual run. */
const MAX_CONSECUTIVE_FAILURES = 3;

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
    }).catch((error: unknown) => {
        // A swallowed registration failure would leave graph refresh dead
        // until the next manual sync — surface it instead.
        console.error('[graph] failed to subscribe to sync-complete:', error);
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [queryClient]);

  useEffect(() => {
    if (items.length < 2 || running.current) return;
    // The digest must reflect the exact slice the generator consumes —
    // otherwise edits outside the window trigger pointless recomputation.
    const digest = computeGraphSourceDigest(items);
    if (localStorage.getItem(GRAPH_DIGEST_KEY) === digest) return;
    // After a failed generation, wait out an exponential backoff before
    // retrying the same input instead of re-running the LLM on every tick.
    const failedAt = Number(localStorage.getItem(GRAPH_FAILURE_KEY) ?? 0);
    const consecutiveFailures = Number(
      localStorage.getItem(GRAPH_CONSECUTIVE_FAILURES_KEY) ?? 0,
    );
    if (failedAt > 0 && Date.now() - failedAt < backoffDurationMs(consecutiveFailures)) return;
    // Break endless silent retry loops: after MAX_CONSECUTIVE_FAILURES the
    // hook stops auto-running. A successful manual generation resets the
    // counter.
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(
        `[graph] skipping auto-regeneration after ${consecutiveFailures} consecutive failures; ` +
          'run the graph manually to retry',
      );
      return;
    }

    const timeout = window.setTimeout(() => {
      running.current = true;
      void generateKnowledgeGraph(coreClient, items)
        .then(() => {
          localStorage.setItem(GRAPH_DIGEST_KEY, digest);
          localStorage.removeItem(GRAPH_FAILURE_KEY);
          localStorage.removeItem(GRAPH_CONSECUTIVE_FAILURES_KEY);
          return queryClient.invalidateQueries({ queryKey: ['recommendations'] });
        })
        .catch((error: unknown) => {
          console.error('[graph] knowledge graph generation failed:', error);
          localStorage.setItem(GRAPH_FAILURE_KEY, String(Date.now()));
          localStorage.setItem(
            GRAPH_CONSECUTIVE_FAILURES_KEY,
            String(consecutiveFailures + 1),
          );
        })
        .finally(() => {
          running.current = false;
        });
    }, 1_000);
    return () => window.clearTimeout(timeout);
  }, [coreClient, items, queryClient]);
}
