/**
 * Mobile CoreClient: thin wrapper over the shared rustra adapter.
 *
 * Mirrors the desktop wrapper (`apps/desktop/src/features/core/
 * rustra-core-client.ts`): all command wiring lives in `@glimpse/shared`
 * (`createSharedRustraCoreClient`), and mobile only injects its two platform
 * behaviors:
 * - `initialize` dispatches the `initializeCore` command with the same DB
 *   path the previous Nitro path computed; the bridge global then owns the
 *   single SQLite connection for the process.
 * - `calculateNextReview` delegates to the in-process TS scheduler in
 *   `@glimpse/features` (the bridge no longer carries a calculate command).
 */

import {
  createRustraCoreClient as createSharedRustraCoreClient,
  type CalculateNextReviewInput,
  type CoreClient,
} from '@glimpse/shared';
import { calculateNextReviewState } from '@glimpse/features';
import { initializeCore } from '@glimpse/bridge-generated';

export function createRustraCoreClient(): CoreClient {
  return createSharedRustraCoreClient({
    initialize: async (dbPath: string) => {
      // Opens (or reuses) the process-wide SharedCore on the Rust side —
      // exactly one SQLite connection, owned by the bridge global.
      await initializeCore({ dbPath });
    },
    calculateNextReview: async ({
      lastReviewedAt,
      nextReviewAt,
      feedbackType,
      now,
      stability,
      difficulty,
    }: CalculateNextReviewInput) =>
      calculateNextReviewState(lastReviewedAt, nextReviewAt, feedbackType, now, {
        stabilityDays: stability ?? 0.5,
        difficulty: difficulty ?? 5.0,
      }),
  });
}
