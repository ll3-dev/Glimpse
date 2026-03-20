import type {
  CalculateNextReviewInput,
  CalculateNextReviewOutput,
  CalculateTagOverlapInput,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
} from '@glimpse/shared';

export const crabyCoreClient = {
  isAvailable(): boolean {
    return false;
  },

  calculateTagOverlap(_input: CalculateTagOverlapInput): number {
    throw new Error('GlimpseCore Craby bridge is not available on this platform');
  },

  calculateNextReview(_input: CalculateNextReviewInput): CalculateNextReviewOutput {
    throw new Error('GlimpseCore Craby bridge is not available on this platform');
  },

  initializeReviewSchedule(
    _input: InitializeReviewScheduleInput
  ): InitializeReviewScheduleOutput {
    throw new Error('GlimpseCore Craby bridge is not available on this platform');
  },
};
