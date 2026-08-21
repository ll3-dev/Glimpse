import type {
  CoreClient,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
} from '@glimpse/shared';

export const DEFAULT_REVIEW_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_POSTPONE_INTERVAL_MS = 4 * 60 * 60 * 1000;
export const DEFAULT_INITIAL_REVIEW_INTERVAL_MS = 10 * 60 * 1000;

export function calculateInitialReviewAt(
  createdAt: number,
  intervalMs = DEFAULT_INITIAL_REVIEW_INTERVAL_MS,
): number {
  return createdAt + intervalMs;
}
export async function initializeReviewScheduleWithCore(
  coreClient: Pick<CoreClient, 'initializeReviewSchedule'>,
  createdAt: number,
  intervalMs = DEFAULT_INITIAL_REVIEW_INTERVAL_MS,
): Promise<InitializeReviewScheduleOutput> {
  const input: InitializeReviewScheduleInput = { createdAt, intervalMs };
  return coreClient.initializeReviewSchedule(input);
}
