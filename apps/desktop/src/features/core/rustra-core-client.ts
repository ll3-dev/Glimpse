/**
 * Desktop CoreClient: thin wrapper over the shared rustra adapter.
 *
 * All command wiring lives in
 * `@glimpse/shared` (`createSharedRustraCoreClient`); desktop only injects
 * its two platform behaviors:
 * - `initialize` is a no-op because the SQLite database is opened once in
 *   the Tauri setup hook (main.rs) and handed to the bridge via init_core.
 * - `calculateNextReview` delegates to the in-process TS scheduler in
 *   `@glimpse/features` (the bridge no longer carries a calculate command).
 */

import {
  createRustraCoreClient as createSharedRustraCoreClient,
  type CalculateNextReviewInput,
  type CoreClient,
} from '@glimpse/shared';
import { calculateNextReviewState } from '@glimpse/features';

export function createRustraCoreClient(): CoreClient {
  return createSharedRustraCoreClient({
    initialize: async () => {
      // The SQLite database is opened in the Tauri setup hook (main.rs);
      // nothing to do here.
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
