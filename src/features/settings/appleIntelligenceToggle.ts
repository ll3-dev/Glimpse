/**
 * Apple Intelligence Toggle
 *
 * Manages Apple Intelligence settings for on-device AI.
 * This is a stub implementation - actual Apple Intelligence API
 * integration will be added in future updates.
 */

import { Platform } from 'react-native';

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

// In-memory storage
let appleIntelligenceEnabled = false;

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

/**
 * Checks if Apple Intelligence is available on the current platform.
 *
 * @returns Object with availability status and reason if unavailable
 */
export function checkAppleIntelligenceAvailability(): {
  available: boolean;
  reason?: string;
} {
  const { OS, Version } = Platform;

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
export function getAppleIntelligenceConfig(): AppleIntelligenceConfig {
  const { available, reason } = checkAppleIntelligenceAvailability();

  return {
    enabled: available && appleIntelligenceEnabled,
    isAvailable: available,
    unavailableReason: reason,
  };
}

/**
 * Checks if Apple Intelligence is enabled.
 *
 * @returns true if enabled
 */
export function isAppleIntelligenceEnabled(): boolean {
  const { available } = checkAppleIntelligenceAvailability();
  return available && appleIntelligenceEnabled;
}

/**
 * Enables Apple Intelligence.
 *
 * @returns true if successfully enabled
 */
export function enableAppleIntelligence(): boolean {
  const { available } = checkAppleIntelligenceAvailability();
  if (!available) {
    return false;
  }

  appleIntelligenceEnabled = true;
  return true;
}

/**
 * Disables Apple Intelligence.
 */
export function disableAppleIntelligence(): void {
  appleIntelligenceEnabled = false;
}

/**
 * Sets Apple Intelligence enabled state.
 *
 * @param enabled - Desired enabled state
 * @returns true if successfully set
 */
export function setAppleIntelligenceEnabled(enabled: boolean): boolean {
  if (enabled) {
    return enableAppleIntelligence();
  } else {
    disableAppleIntelligence();
    return true;
  }
}

/**
 * Gets the inference provider to use.
 * Returns 'apple-intelligence' if enabled, otherwise falls back to default.
 *
 * @returns Provider identifier
 */
export function getInferenceProvider(): 'apple-intelligence' | 'default' {
  if (isAppleIntelligenceEnabled()) {
    return 'apple-intelligence';
  }
  return 'default';
}
