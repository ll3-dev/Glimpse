import type { NativeModule } from 'craby-modules';
import { NativeModuleRegistry } from 'craby-modules';

export interface GlimpseCalculateNextReviewOutput {
  intervalMs: number;
  nextReviewAt: number;
}

export interface GlimpseInitializeReviewScheduleOutput {
  nextReviewAt: number;
  stability: number | null;
  difficulty: number | null;
  lastReviewedAt: number | null;
}

export interface GlimpseCoreSpec extends NativeModule {
  calculateTagOverlap(leftTags: string[] | null, rightTags: string[] | null): number;
  calculateNextReview(
    lastReviewedAt: number | null,
    nextReviewAt: number | null,
    feedbackType: string,
    now: number
  ): GlimpseCalculateNextReviewOutput;
  initializeReviewSchedule(
    createdAt: number,
    intervalMs: number | null
  ): GlimpseInitializeReviewScheduleOutput;
}

export default NativeModuleRegistry.get<GlimpseCoreSpec>('GlimpseCore');
