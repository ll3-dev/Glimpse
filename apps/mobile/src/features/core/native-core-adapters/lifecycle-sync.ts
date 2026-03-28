import type { BridgeCoreClient } from '../types';

import type { NativeAdapterDeps } from './common';

export function createLifecycleAndSyncAdapter(
  deps: NativeAdapterDeps,
): Pick<
  BridgeCoreClient,
  'initialize' | 'calculateTagOverlap' | 'calculateNextReview' | 'initializeReviewSchedule'
> {
  const { fallbackClient, runCoreAsync } = deps;

  return {
    async initialize(dbPath) {
      await runCoreAsync(
        (client) => client.initialize(dbPath),
        () => fallbackClient.initialize(dbPath),
      );
    },

    calculateTagOverlap(input) {
      return runCoreAsync(
        (client) => {
          const overlap = client.calculateTagOverlap(
            input.left.tags ?? [],
            input.right.tags ?? [],
          );
          return Promise.resolve(overlap);
        },
        () => fallbackClient.calculateTagOverlap(input),
      );
    },

    calculateNextReview(input) {
      return runCoreAsync(
        (client) => {
          const result = client.calculateNextReview(
            input.lastReviewedAt ?? null,
            input.nextReviewAt ?? null,
            input.feedbackType === 'remembered' ? 0 : 1,
            input.now,
          );
          return Promise.resolve({
            intervalMs: result.intervalMs,
            nextReviewAt: result.nextReviewAt,
          });
        },
        () => fallbackClient.calculateNextReview(input),
      );
    },

    initializeReviewSchedule(input) {
      return runCoreAsync(
        (client) => {
          const result = client.initializeReviewSchedule(
            input.createdAt,
            input.intervalMs ?? null,
          );
          return Promise.resolve({
            nextReviewAt: result.nextReviewAt,
            stability: result.stability,
            difficulty: result.difficulty,
            lastReviewedAt: result.lastReviewedAt,
          });
        },
        () => fallbackClient.initializeReviewSchedule(input),
      );
    },
  };
}
