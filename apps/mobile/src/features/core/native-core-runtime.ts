import { NitroModules } from 'react-native-nitro-modules';

import type { CoreClient } from '../../../generate/CoreClient.nitro';

const isTestEnvironment = typeof Bun !== 'undefined';

export interface NativeCoreRuntime {
  runCore<T>(runWithCore: (client: CoreClient) => T, runFallback: () => T): T;
  runCoreAsync<T>(
    runWithCore: (client: CoreClient) => Promise<T>,
    runFallback: () => Promise<T> | T,
  ): Promise<T>;
}

export function createNativeCoreRuntime(): NativeCoreRuntime {
  let coreClient: CoreClient | null = null;

  try {
    coreClient = NitroModules.createHybridObject<CoreClient>('CoreClient');
    console.log('✅ Nitro CoreClient module loaded successfully');
  } catch (error) {
    if (!isTestEnvironment) {
      console.warn('Nitro module unavailable, using in-memory stub');
    }
    console.warn('⚠️ Nitro CoreClient module not registered, using in-memory stub implementation:', error);
  }

  return {
    runCore<T>(runWithCore: (client: CoreClient) => T, runFallback: () => T): T {
      return coreClient ? runWithCore(coreClient) : runFallback();
    },

    runCoreAsync<T>(
      runWithCore: (client: CoreClient) => Promise<T>,
      runFallback: () => Promise<T> | T,
    ): Promise<T> {
      return coreClient ? runWithCore(coreClient) : Promise.resolve(runFallback());
    },
  };
}
