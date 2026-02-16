/**
 * Apple Intelligence Toggle
 *
 * Manages Apple Intelligence settings for on-device AI.
 * This is a stub implementation - actual Apple Intelligence API
 * integration will be added in future updates.
 */

import { Effect } from 'effect';
import {
  createAppleIntelligenceStore,
  getAppleIntelligenceEnabled,
  setAppleIntelligenceEnabledValue,
  useAppleIntelligenceStoreValue,
} from '@/src/stores/settings/appleIntelligence.store';

/**
 * Minimum OS versions supporting Apple Intelligence
 */
const MIN_VERSIONS = {
  ios: '18.1',
  macos: '15.1',
};

/**
 * Apple Intelligence configuration
 */
export interface AppleIntelligenceConfig {
  enabled: boolean;
  isAvailable: boolean;
  unavailableReason?: string;
}

export interface AppleIntelligencePlatform {
  OS: string;
  Version: string | number;
}

export interface AppleIntelligenceToggleDeps {
  platform: AppleIntelligencePlatform;
}

function resolveDefaultPlatform(): AppleIntelligencePlatform {
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

const defaultDeps: AppleIntelligenceToggleDeps = {
  platform: resolveDefaultPlatform(),
};

/**
 * Parses a version string (e.g., "18.1") into parts
 */
function parseVersion(version: string): number[] {
  return version.split('.').map((v) => parseInt(v, 10) || 0);
}

/**
 * Compares two version strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const aParts = parseVersion(a);
  const bParts = parseVersion(b);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;

    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }

  return 0;
}

export function createAppleIntelligenceToggle(deps: AppleIntelligenceToggleDeps = defaultDeps) {
  const appleIntelligenceStore = createAppleIntelligenceStore();

  /**
   * Checks if Apple Intelligence is available on the current platform.
   *
   * @returns Object with availability status and reason if unavailable
   */
  function checkAppleIntelligenceAvailability(): {
    available: boolean;
    reason?: string;
  } {
    const { OS, Version } = deps.platform;

    // Android and other platforms don't support Apple Intelligence
    if (OS !== 'ios' && OS !== 'macos') {
      return {
        available: false,
        reason: 'Apple Intelligence는 Apple 기기에서만 사용할 수 있습니다',
      };
    }

    // Get minimum required version
    const minVersion = OS === 'ios' ? MIN_VERSIONS.ios : MIN_VERSIONS.macos;
    const currentVersion = String(Version);

    // Check version
    if (compareVersions(currentVersion, minVersion) < 0) {
      return {
        available: false,
        reason: `${OS === 'ios' ? 'iOS' : 'macOS'} ${minVersion} 이상이 필요합니다`,
      };
    }

    return { available: true };
  }

  /**
   * Gets the current Apple Intelligence configuration.
   *
   * @returns Apple Intelligence config
   */
  function getAppleIntelligenceConfig(): AppleIntelligenceConfig {
    const { available, reason } = checkAppleIntelligenceAvailability();
    const enabled = getAppleIntelligenceEnabled(appleIntelligenceStore);

    return {
      enabled: available && enabled,
      isAvailable: available,
      unavailableReason: reason,
    };
  }

  /**
   * React hook to subscribe Apple Intelligence config updates.
   */
  function useAppleIntelligenceConfig(): AppleIntelligenceConfig {
    return useAppleIntelligenceStoreValue(appleIntelligenceStore, (state) => {
      const { available, reason } = checkAppleIntelligenceAvailability();
      return {
        enabled: available && state.enabled,
        isAvailable: available,
        unavailableReason: reason,
      };
    });
  }

  /**
   * Checks if Apple Intelligence is enabled.
   *
   * @returns true if enabled
   */
  function isAppleIntelligenceEnabled(): boolean {
    const { available } = checkAppleIntelligenceAvailability();
    return available && getAppleIntelligenceEnabled(appleIntelligenceStore);
  }

  /**
   * Enables Apple Intelligence.
   *
   * @returns true if successfully enabled
   */
  function enableAppleIntelligence(): boolean {
    const { available } = checkAppleIntelligenceAvailability();
    if (!available) {
      return false;
    }

    setAppleIntelligenceEnabledValue(appleIntelligenceStore, true);
    return true;
  }

  /**
   * Disables Apple Intelligence.
   */
  function disableAppleIntelligence(): void {
    setAppleIntelligenceEnabledValue(appleIntelligenceStore, false);
  }

  /**
   * Sets Apple Intelligence enabled state.
   *
   * @param enabled - Desired enabled state
   * @returns true if successfully set
   */
  function setAppleIntelligenceEnabled(enabled: boolean): boolean {
    if (enabled) {
      return enableAppleIntelligence();
    }
    disableAppleIntelligence();
    return true;
  }

  /**
   * Gets the inference provider to use.
   * Returns 'apple-intelligence' if enabled, otherwise falls back to default.
   *
   * @returns Provider identifier
   */
  function getInferenceProvider(): 'apple-intelligence' | 'default' {
    if (isAppleIntelligenceEnabled()) {
      return 'apple-intelligence';
    }
    return 'default';
  }

  return {
    checkAppleIntelligenceAvailability,
    getAppleIntelligenceConfig,
    useAppleIntelligenceConfig,
    isAppleIntelligenceEnabled,
    enableAppleIntelligence,
    disableAppleIntelligence,
    setAppleIntelligenceEnabled,
    getInferenceProvider,
  };
}

const appleIntelligenceToggle = createAppleIntelligenceToggle();

export const checkAppleIntelligenceAvailability =
  appleIntelligenceToggle.checkAppleIntelligenceAvailability;
export const getAppleIntelligenceConfig =
  appleIntelligenceToggle.getAppleIntelligenceConfig;
export const useAppleIntelligenceConfig =
  appleIntelligenceToggle.useAppleIntelligenceConfig;
export const isAppleIntelligenceEnabled =
  appleIntelligenceToggle.isAppleIntelligenceEnabled;
export const enableAppleIntelligence =
  appleIntelligenceToggle.enableAppleIntelligence;
export const disableAppleIntelligence =
  appleIntelligenceToggle.disableAppleIntelligence;
export const setAppleIntelligenceEnabled =
  appleIntelligenceToggle.setAppleIntelligenceEnabled;
export const getInferenceProvider =
  appleIntelligenceToggle.getInferenceProvider;
