import { useEffect, useRef } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';
import { useCoreClient, useKnowledgeItemsQuery } from '@glimpse/hooks';
import { backoffDurationMs } from '@glimpse/shared';
import type { CoreClient, KnowledgeItem } from '@glimpse/shared';
import { generateKnowledgeGraph } from '@/features/graph/generate-knowledge-graph';
import { computeGraphSourceDigest } from '@/features/graph/graph-source-window';

const GRAPH_DIGEST_KEY = 'glimpse_graph_source_digest_v1';
const GRAPH_FAILURE_KEY = 'glimpse_graph_failure_backoff_v1';
const GRAPH_CONSECUTIVE_FAILURES_KEY = 'glimpse_graph_consecutive_failures_v1';
/** After this many consecutive failures, stop auto-retrying until manual run. */
const MAX_CONSECUTIVE_FAILURES = 3;

/** Backoff between chained backlog cycles — same spacing as the initial run. */
const CYCLE_SPACING_MS = 1_000;

interface CycleContext {
  coreClient: CoreClient;
  items: KnowledgeItem[];
  onSuccess: () => Promise<void> | void;
}

/**
 * Drain the incremental backlog: one generator cycle per invocation,
 * chaining with the same spacing while the generator reports remaining
 * backlog AND made progress. The no-progress guard stops tagless-item
 * batches from looping forever. Storing the window digest only after the
 * backlog is fully drained keeps a mid-drain crash from marking the source
 * as done — the effect re-runs and resumes the chain on next tick.
 */
async function runCycle(context: CycleContext, digest: string): Promise<void> {
  let result;
  try {
    result = await generateKnowledgeGraph(context.coreClient, context.items);
  } finally {
    void context.onSuccess();
  }
  if (result.remainingBacklog > 0 && result.createdCount > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, CYCLE_SPACING_MS));
    await runCycle(context, digest);
    return;
  }
  localStorage.setItem(GRAPH_DIGEST_KEY, digest);
  localStorage.removeItem(GRAPH_FAILURE_KEY);
  localStorage.removeItem(GRAPH_CONSECUTIVE_FAILURES_KEY);
}

export function useKnowledgeGraphAutomation() {
  const coreClient = useCoreClient();
  const queryClient = useQueryClient();
  const { data: items = [] } = useKnowledgeItemsQuery();
  const running = useRef(false);

  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | undefined;
    void listen('glimpse://sync-complete', () => {
      // A sync merge can touch any synced entity, but LLM/model state is not
      // synced — refetching it here would defeat the global staleTime for
      // queries the merge cannot change.
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] !== 'chat' &&
          query.queryKey[0] !== 'llm' &&
          query.queryKey[0] !== 'models',
      });
    }).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    }).catch((error: unknown) => {
        // A swallowed registration failure would leave graph refresh dead
        // until the next manual generation — surface it instead.
        console.error('[graph] failed to subscribe to sync-complete:', error);
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [queryClient]);

  useEffect(() => {
    if (items.length < 2 || running.current) return;
    // The digest reflects the source window the generator consumes. Backlog
    // draining is handled by the chain inside runCycle — the effect only
    // needs to fire when the window content itself changes.
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
      const context: CycleContext = {
        coreClient,
        items,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
      };
      void runCycle(context, digest)
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
