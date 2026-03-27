// apps/mobile/src/features/core/native-core-client.native.ts
import type { BridgeCoreClient } from './types';
import { nativeCoreBridgeHelpers } from './native-core-bridge';
import {
  createConversationAdapter,
  createFeedbackAdapter,
  createKnowledgeAdapter,
  createLifecycleAndSyncAdapter,
  createMessageAdapter,
  createRecommendationAdapter,
} from './native-core-adapters';
import { createFallbackCoreClient } from './native-core-fallback-client';
import { createNativeCoreRuntime } from './native-core-runtime';

/**
 * Native CoreClient implementation using Nitro bridge.
 * This file is only used on native platforms (iOS/Android).
 *
 * NOTE: The Nitro module 'CoreClient' must be registered at app startup.
 * The C++ implementation needs to be linked and registered.
 */
function createNativeCoreClient(): BridgeCoreClient {
  const fallbackClient = createFallbackCoreClient();
  const { runCore, runCoreAsync } = createNativeCoreRuntime();

  return {
    ...createLifecycleAndSyncAdapter({ fallbackClient, runCore, runCoreAsync }),
    ...createKnowledgeAdapter({ fallbackClient, runCore, runCoreAsync }),
    ...createConversationAdapter({ fallbackClient, runCore, runCoreAsync }),
    ...createMessageAdapter({ fallbackClient, runCore, runCoreAsync }),
    ...createRecommendationAdapter({ fallbackClient, runCore, runCoreAsync }),
    ...createFeedbackAdapter({ fallbackClient, runCore, runCoreAsync }),
  };
}

export const nativeCoreClient = createNativeCoreClient();
export { nativeCoreBridgeHelpers };
