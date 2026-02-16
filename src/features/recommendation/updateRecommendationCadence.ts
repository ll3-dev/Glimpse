/**
 * Update Recommendation Cadence
 *
 * Automatically adjusts recommendation frequency based on user response rate.
 * Higher engagement = more frequent recommendations.
 */

import type { FeedbackActionType } from '@/src/db';
import { Effect } from 'effect';
import { getRecentFeedbackEvents } from './logRecommendationFeedback';
import { logger } from '@/src/utils/logger';
import { appError, tryPromise } from '@/src/lib/effect-result';

/**
 * Cadence levels (in milliseconds)
 */
export const CADENCE = {
  HIGH: 3 * 24 * 60 * 60 * 1000,   // 3 days - engaged users
  MEDIUM: 7 * 24 * 60 * 60 * 1000, // 7 days - normal engagement
  LOW: 14 * 24 * 60 * 60 * 1000,   // 14 days - low engagement
} as const;

export type CadenceLevel = keyof typeof CADENCE;

/**
 * Response rate thresholds
 */
const RATE_THRESHOLDS = {
  HIGH: 0.6,    // 60%+ accept rate = high cadence
  MEDIUM: 0.3,  // 30%+ accept rate = medium cadence
  LOW: 0,       // below 30% = low cadence
} as const;

/**
 * Number of recent events to consider for rate calculation
 */
const SAMPLE_SIZE = 20;

/**
 * In-memory cadence storage (can be upgraded to AsyncStorage later)
 */
let currentCadence: number = CADENCE.MEDIUM;

/**
 * Calculates the acceptance rate from recent feedback events.
 *
 * @param events - Array of feedback events
 * @returns Acceptance rate (0-1)
 */
export function calculateResponseRate(events: { action: FeedbackActionType }[]): number {
  if (events.length === 0) {
    return 0.5; // Default to medium if no data
  }

  const acceptCount = events.filter(e => e.action === 'accept').length;
  return acceptCount / events.length;
}

/**
 * Determines the appropriate cadence level based on response rate.
 *
 * @param responseRate - Acceptance rate (0-1)
 * @returns Cadence level
 */
export function determineCadenceLevel(responseRate: number): CadenceLevel {
  if (responseRate >= RATE_THRESHOLDS.HIGH) {
    return 'HIGH';
  }
  if (responseRate >= RATE_THRESHOLDS.MEDIUM) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Gets the cadence interval in milliseconds for a given level.
 *
 * @param level - Cadence level
 * @returns Interval in milliseconds
 */
export function getCadenceInterval(level: CadenceLevel): number {
  return CADENCE[level];
}

/**
 * Gets the current recommendation cadence.
 *
 * @returns Current cadence interval in milliseconds
 */
export function getCadence(): number {
  return currentCadence;
}

/**
 * Sets the recommendation cadence.
 *
 * @param cadence - New cadence interval in milliseconds
 */
export function setCadence(cadence: number): void {
  currentCadence = cadence;
  logger.info('Recommendation cadence updated', {
    cadenceDays: Math.round(cadence / (24 * 60 * 60 * 1000)),
  });
}

/**
 * Updates the recommendation cadence based on recent feedback.
 * Should be called periodically (e.g., when user responds to a recommendation).
 *
 * @returns The new cadence interval
 */
export async function updateRecommendationCadence(): Promise<number> {
  const program = Effect.gen(function* () {
    const result = yield* tryPromise(
      () => getRecentFeedbackEvents(SAMPLE_SIZE),
      (error) =>
        appError('UNKNOWN_ERROR', 'Failed to get recent feedback for cadence update', error)
    );

    if (result.success === false) {
      logger.warn('Failed to get recent feedback for cadence update', {
        code: result.error.code,
        message: result.error.message,
      });
      return currentCadence;
    }

    const responseRate = calculateResponseRate(result.data);
    const level = determineCadenceLevel(responseRate);
    const newCadence = getCadenceInterval(level);

    if (newCadence !== currentCadence) {
      setCadence(newCadence);
    }

    logger.info('Cadence calculation complete', {
      responseRate: Math.round(responseRate * 100),
      level,
      cadenceDays: Math.round(newCadence / (24 * 60 * 60 * 1000)),
    });

    return newCadence;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        logger.error('Failed to update recommendation cadence', error);
        return currentCadence;
      })
    )
  );

  return Effect.runPromise(program);
}

/**
 * Gets the timestamp for the next recommendation based on current cadence.
 *
 * @param lastRecommendationAt - Timestamp of last recommendation
 * @returns Timestamp for next recommendation
 */
export function getNextRecommendationAt(lastRecommendationAt: number): number {
  return lastRecommendationAt + currentCadence;
}

/**
 * Checks if enough time has passed since last recommendation.
 *
 * @param lastRecommendationAt - Timestamp of last recommendation
 * @returns true if it's time for a new recommendation
 */
export function shouldShowRecommendation(lastRecommendationAt: number | null): boolean {
  if (lastRecommendationAt === null) {
    return true;
  }
  return Date.now() >= getNextRecommendationAt(lastRecommendationAt);
}
