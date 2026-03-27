import type { BridgeCoreClient } from '../types';

import type { NativeAdapterDeps } from './common';

export function createLifecycleAndSyncAdapter(
  deps: NativeAdapterDeps,
): Pick<
  BridgeCoreClient,
  'initialize' | 'calculateTagOverlap' | 'calculateNextReview' | 'initializeReviewSchedule'
> {
  const { fallbackClient, runCore, runCoreAsync } = deps;

  return {
    async initialize(dbPath) {
      await runCoreAsync(
        (client) => client.initialize(dbPath),
        () => fallbackClient.initialize(dbPath),
      );
    },

    calculateTagOverlap(input) {
      return runCore(
        (client) => client.calculateTagOverlap(input.left.tags ?? [], input.right.tags ?? []),
        () => fallbackClient.calculateTagOverlap(input),
      );
    },

    calculateNextReview(input) {
      return runCore(
        (client) => {
          const result = client.calculateNextReview(
            input.lastReviewedAt ?? null,
            input.nextReviewAt ?? null,
            input.feedbackType === 'remembered' ? 0 : 1,
            input.now,
          );
          return {
            intervalMs: result.intervalMs,
            nextReviewAt: result.nextReviewAt,
          };
        },
        () => fallbackClient.calculateNextReview(input),
      );
    },

    initializeReviewSchedule(input) {
      return runCore(
        (client) => {
          const result = client.initializeReviewSchedule(
            input.createdAt,
            input.intervalMs ?? null,
          );
          return {
            nextReviewAt: result.nextReviewAt,
            stability: result.stability,
            difficulty: result.difficulty,
            lastReviewedAt: result.lastReviewedAt,
          };
        },
        () => fallbackClient.initializeReviewSchedule(input),
      );
    },
  };
}
