import type {
  CalculateNextReviewInput,
  CalculateNextReviewOutput,
  CalculateTagOverlapInput,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
} from '@glimpse/shared';
import { GlimpseCore } from '@glimpse/mobile-core-module';

function getNativeCore() {
  return GlimpseCore;
}

function getRequiredNativeCore() {
  const core = getNativeCore();
  if (core === null) {
    throw new Error('GlimpseCore Craby bridge is not registered');
  }
  return core;
}

export const crabyCoreClient = {
  isAvailable(): boolean {
    return getNativeCore() !== null;
  },

  calculateTagOverlap(input: CalculateTagOverlapInput): number {
    return getRequiredNativeCore().calculateTagOverlap(
      input.left.tags ?? null,
      input.right.tags ?? null
    );
  },

  calculateNextReview(input: CalculateNextReviewInput): CalculateNextReviewOutput {
    const result = getRequiredNativeCore().calculateNextReview(
      input.lastReviewedAt,
      input.nextReviewAt,
      input.feedbackType,
      input.now
    );

    return {
      intervalMs: result.intervalMs,
      nextReviewAt: result.nextReviewAt,
    };
  },

  initializeReviewSchedule(
    input: InitializeReviewScheduleInput
  ): InitializeReviewScheduleOutput {
    const result = getRequiredNativeCore().initializeReviewSchedule(
      input.createdAt,
      input.intervalMs ?? null
    );

    return {
      nextReviewAt: result.nextReviewAt,
      stability: result.stability,
      difficulty: result.difficulty,
      lastReviewedAt: result.lastReviewedAt,
    };
  },
};
