import type { FeedbackEvent, Recommendation } from '@glimpse/shared';

import { nativeCoreBridgeHelpers } from '../native-core-bridge';
import type { BridgeCoreClient } from '../types';

import type { NativeAdapterDeps } from './common';

const {
  fromNitroRecommendation,
  toNitroFeedbackEvent,
  toNitroRecommendation,
} = nativeCoreBridgeHelpers;

export function createRecommendationAdapter(
  deps: NativeAdapterDeps,
): Pick<
  BridgeCoreClient,
  | 'saveRecommendations'
  | 'listRecommendations'
  | 'listPendingRecommendations'
  | 'respondToRecommendation'
> {
  const { fallbackClient, runCoreAsync } = deps;

  return {
    async saveRecommendations(recommendations: Recommendation[]): Promise<void> {
      await runCoreAsync(
        (client) => client.saveRecommendations(recommendations.map(toNitroRecommendation)),
        () => fallbackClient.saveRecommendations(recommendations),
      );
    },

    async listRecommendations(): Promise<Recommendation[]> {
      return runCoreAsync(
        async (client) => (await client.listRecommendations()).map(fromNitroRecommendation),
        () => fallbackClient.listRecommendations(),
      );
    },

    async listPendingRecommendations(): Promise<Recommendation[]> {
      return runCoreAsync(
        async (client) =>
          (await client.listPendingRecommendations()).map(fromNitroRecommendation),
        () => fallbackClient.listPendingRecommendations(),
      );
    },

    async respondToRecommendation(
      recommendationId: string,
      status: 'accepted' | 'ignored' | 'dismissed',
      feedbackEvent: FeedbackEvent,
    ): Promise<void> {
      await runCoreAsync<void>(
        (client) =>
          client.respondToRecommendation(
            recommendationId,
            status,
            toNitroFeedbackEvent(feedbackEvent),
          ),
        () => fallbackClient.respondToRecommendation(recommendationId, status, feedbackEvent),
      );
    },
  };
}
