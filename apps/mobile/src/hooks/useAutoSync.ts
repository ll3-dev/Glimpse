import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getSyncConfig, syncWithDesktop } from '@/src/features/sync';
import {
  CHANGE_DEBOUNCE_MS,
  BASE_POLL_MS,
  nextPollIntervalMs,
  shouldAttemptAfterLocalChange,
} from '@/src/features/sync/sync-schedule';
import { mobileCoreClient } from '@/src/features/core';
import { logger } from '@/src/utils/logger';

/**
 * Adaptive desktop sync: a poll observes whether the desktop had anything
 * new (result of `syncWithDesktop`), idle polls back off geometrically to
 * the 5-minute ceiling, and local writes (tracked via the core's sync-table
 * write counter) arm a debounced attempt so mobile edits propagate within
 * seconds instead of waiting for the next poll.
 */
export function useAutoSync(): void {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollMsRef = useRef(BASE_POLL_MS);
  const lastRevisionRef = useRef<number | null>(null);
  const debounceArmedAtRef = useRef<number | null>(null);
  const changeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    const sync = () =>
      syncWithDesktop()
        .then((changed) => {
          if (!mounted) return;
          pollMsRef.current = nextPollIntervalMs(pollMsRef.current, changed);
          restartPolling();
          if (!changed) return;
          // A merge can touch any synced entity, but chat lives only on
          // this device — refetching it on every sync would defeat the
          // global staleTime for queries the merge cannot change.
          void queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] !== 'chat',
          });
        })
        .catch((error) =>
          logger.warn('Automatic desktop sync failed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        );

    const restartPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(schedule, pollMsRef.current);
    };

    /** Poll attempt: also refreshes the local-revision baseline. */
    const schedule = () => {
      if (!getSyncConfig().desktopDeviceId || !getSyncConfig().autoSync) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void sync(), 1_000);
      void refreshLocalRevision();
    };

    /** Detect local writes cheaply: the sync-table trigger counter moved. */
    const refreshLocalRevision = async () => {
      if (!mobileCoreClient.syncDataRevision) return;
      try {
        const revision = await mobileCoreClient.syncDataRevision();
        if (revision == null) return;
        const previous = lastRevisionRef.current;
        lastRevisionRef.current = revision;
        if (
          previous != null &&
          revision !== previous &&
          shouldAttemptAfterLocalChange(
            debounceArmedAtRef.current,
            Date.now(),
            CHANGE_DEBOUNCE_MS,
          )
        ) {
          debounceArmedAtRef.current = Date.now();
          if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
          changeTimerRef.current = setTimeout(() => {
            debounceArmedAtRef.current = null;
            void sync();
          }, CHANGE_DEBOUNCE_MS);
        }
      } catch {
        // Revision probing is an optimization only; the poll remains the
        // correctness backstop when the core client cannot answer.
      }
    };

    schedule();
    restartPolling();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        pollMsRef.current = BASE_POLL_MS;
        schedule();
        restartPolling();
      }
    });
    return () => {
      mounted = false;
      subscription.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
    };
  }, [queryClient]);
}
