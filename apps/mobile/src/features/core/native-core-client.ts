// apps/mobile/src/features/core/native-core-client.ts
// Web fallback - native CoreClient is not available on web
import type { BridgeCoreClient } from './types';

function createStubCoreClient(): BridgeCoreClient {
  throw new Error('Native CoreClient is not available on web platform');
}

export const nativeCoreClient = createStubCoreClient();
