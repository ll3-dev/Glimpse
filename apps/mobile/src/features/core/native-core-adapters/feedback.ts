import type { FeedbackEvent } from '@glimpse/shared';

import { nativeCoreBridgeHelpers } from '../native-core-bridge';
import type { BridgeCoreClient } from '../types';

import type { NativeAdapterDeps } from './common';

const { fromNitroFeedbackEvent, toNitroFeedbackEvent } = nativeCoreBridgeHelpers;

export function createFeedbackAdapter(
  deps: NativeAdapterDeps,
): Pick<BridgeCoreClient, 'listRecentFeedbackEvents' | 'logRecommendationFeedback'> {
  const { fallbackClient, runCoreAsync } = deps;

  return {
    async listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]> {
      return runCoreAsync(
        async (client) =>
          (await client.listRecentFeedbackEvents(limit)).map(fromNitroFeedbackEvent),
        () => fallbackClient.listRecentFeedbackEvents(limit),
      );
    },

    async logRecommendationFeedback(event: FeedbackEvent): Promise<FeedbackEvent> {
      return runCoreAsync(
        async (client) =>
          fromNitroFeedbackEvent(
            await client.logRecommendationFeedback(toNitroFeedbackEvent(event)),
          ),
        () => fallbackClient.logRecommendationFeedback(event),
      );
    },
  };
}
