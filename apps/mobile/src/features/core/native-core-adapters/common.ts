import type { NativeCoreRuntime } from '../native-core-runtime';
import type { BridgeCoreClient } from '../types';

export interface NativeAdapterDeps {
  fallbackClient: BridgeCoreClient;
  runCore: NativeCoreRuntime['runCore'];
  runCoreAsync: NativeCoreRuntime['runCoreAsync'];
}
