/**
 * Log Recommendation Feedback Use Case
 *
 * Logs user feedback events to recommendations for analytics and learning.
 */

import { nanoid } from 'nanoid';
import { db, feedbackEvents, type FeedbackEvent, type NewFeedbackEvent, type FeedbackActionType } from '@/src/db';
import { desc } from 'drizzle-orm';

export interface LogFeedbackResult {
  success: true;
  event: FeedbackEvent;
}

export interface LogFeedbackFailureResult {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type LogRecommendationFeedbackResult = LogFeedbackResult | LogFeedbackFailureResult;

export interface RecentFeedbackResult {
  success: true;
  data: FeedbackEvent[];
}

export interface RecentFeedbackFailureResult {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type GetRecentFeedbackResult = RecentFeedbackResult | RecentFeedbackFailureResult;

export interface RecommendationFeedbackDeps {
  db: typeof db;
  feedbackEvents: typeof feedbackEvents;
  desc: typeof desc;
  nanoid: typeof nanoid;
}

const defaultDeps: RecommendationFeedbackDeps = {
  db,
  feedbackEvents,
  desc,
  nanoid,
};

/**
 * Retrieves recent feedback events, ordered by creation date (newest first).
 */
export function createLogRecommendationFeedback(deps: RecommendationFeedbackDeps = defaultDeps) {
  return async function logRecommendationFeedback(
    recommendationId: string,
    action: FeedbackActionType
  ): Promise<LogRecommendationFeedbackResult> {
    try {
      const now = Date.now();
      const newEvent: NewFeedbackEvent = {
        id: deps.nanoid(),
        recommendationId,
        action,
        createdAt: now,
      };

      await deps.db.insert(deps.feedbackEvents).values(newEvent);

      return {
        success: true,
        event: newEvent as FeedbackEvent,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to log feedback event',
          details: error instanceof Error ? error.message : error,
        },
      };
    }
  };
}

export function createGetRecentFeedbackEvents(deps: RecommendationFeedbackDeps = defaultDeps) {
  return async function getRecentFeedbackEvents(
    limit: number = 50
  ): Promise<GetRecentFeedbackResult> {
    try {
      const events = await deps.db
        .select()
        .from(deps.feedbackEvents)
        .orderBy(deps.desc(deps.feedbackEvents.createdAt))
        .limit(limit);

      return {
        success: true,
        data: events,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to retrieve feedback events',
          details: error instanceof Error ? error.message : error,
        },
      };
    }
  };
}

export const logRecommendationFeedback = createLogRecommendationFeedback();
export const getRecentFeedbackEvents = createGetRecentFeedbackEvents();
