import { Effect } from 'effect';
import type { AppleIntelligencePlatform } from './appleIntelligence.types';

export function resolveDefaultPlatform(): AppleIntelligencePlatform {
  const maybeRequire = globalThis as typeof globalThis & {
    require?: (id: string) => unknown;
  };

  if (typeof maybeRequire.require === 'function') {
    const maybePlatform = Effect.try({
      try: () => {
        const reactNativeModule = maybeRequire.require?.('react-native') as {
          Platform?: AppleIntelligencePlatform;
        };
        return reactNativeModule?.Platform;
      },
      catch: () => undefined,
    });

    const platform = Effect.runSync(maybePlatform);
    if (platform) {
      return platform;
    }
  }

  return { OS: 'web', Version: '0' };
}
