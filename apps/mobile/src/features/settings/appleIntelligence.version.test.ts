import { describe, expect, test } from 'bun:test';
import {
  compareVersions,
  checkAppleIntelligenceAvailability,
} from './appleIntelligence.version';
import type { AppleIntelligencePlatform } from './appleIntelligence.types';

describe('compareVersions', () => {
  test('returns 0 for equal versions', () => {
    expect(compareVersions('18.1', '18.1')).toBe(0);
    expect(compareVersions('15.1.0', '15.1.0')).toBe(0);
  });

  test('returns 1 when first version is greater', () => {
    expect(compareVersions('18.2', '18.1')).toBe(1);
    expect(compareVersions('19.0', '18.1')).toBe(1);
    expect(compareVersions('18.1.1', '18.1')).toBe(1);
  });

  test('returns -1 when first version is smaller', () => {
    expect(compareVersions('18.0', '18.1')).toBe(-1);
    expect(compareVersions('17.0', '18.1')).toBe(-1);
    expect(compareVersions('18.1', '18.1.1')).toBe(-1);
  });

  test('handles different segment counts', () => {
    expect(compareVersions('18.1.0', '18.1')).toBe(0);
    expect(compareVersions('18.1.1', '18.1')).toBe(1);
    expect(compareVersions('18.1', '18.1.1')).toBe(-1);
  });

  test('handles major version differences', () => {
    expect(compareVersions('19.0', '18.0')).toBe(1);
    expect(compareVersions('18.0', '19.0')).toBe(-1);
  });

  test('handles minor version differences', () => {
    expect(compareVersions('18.2', '18.1')).toBe(1);
    expect(compareVersions('18.0', '18.10')).toBe(-1);
  });

  test('handles patch version differences', () => {
    expect(compareVersions('18.1.2', '18.1.1')).toBe(1);
    expect(compareVersions('18.1.1', '18.1.2')).toBe(-1);
  });
});

describe('checkAppleIntelligenceAvailability', () => {
  test('returns available for iOS 18.1', () => {
    const platform: AppleIntelligencePlatform = {
      OS: 'ios',
      Version: '18.1',
    };
    const result = checkAppleIntelligenceAvailability(platform);
    expect(result.available).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  test('returns available for iOS version above minimum', () => {
    const platform: AppleIntelligencePlatform = {
      OS: 'ios',
      Version: '18.5',
    };
    const result = checkAppleIntelligenceAvailability(platform);
    expect(result.available).toBe(true);
  });

  test('returns unavailable for iOS version below minimum', () => {
    const platform: AppleIntelligencePlatform = {
      OS: 'ios',
      Version: '18.0',
    };
    const result = checkAppleIntelligenceAvailability(platform);
    expect(result.available).toBe(false);
    expect(result.reason).toContain('iOS');
    expect(result.reason).toContain('18.1');
  });

  test('returns available for macOS 15.1', () => {
    const platform: AppleIntelligencePlatform = {
      OS: 'macos',
      Version: '15.1',
    };
    const result = checkAppleIntelligenceAvailability(platform);
    expect(result.available).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  test('returns available for macOS version above minimum', () => {
    const platform: AppleIntelligencePlatform = {
      OS: 'macos',
      Version: '16.0',
    };
    const result = checkAppleIntelligenceAvailability(platform);
    expect(result.available).toBe(true);
  });

  test('returns unavailable for macOS version below minimum', () => {
    const platform: AppleIntelligencePlatform = {
      OS: 'macos',
      Version: '15.0',
    };
    const result = checkAppleIntelligenceAvailability(platform);
    expect(result.available).toBe(false);
    expect(result.reason).toContain('macOS');
    expect(result.reason).toContain('15.1');
  });

  test('returns unavailable for non-Apple platforms', () => {
    const platform: AppleIntelligencePlatform = {
      OS: 'android',
      Version: '14',
    };
    const result = checkAppleIntelligenceAvailability(platform);
    expect(result.available).toBe(false);
    expect(result.reason).toContain('Apple Intelligence');
    expect(result.reason).toContain('Apple 기기');
  });

  test('handles numeric version', () => {
    const platform: AppleIntelligencePlatform = {
      OS: 'ios',
      Version: 18.1,
    };
    const result = checkAppleIntelligenceAvailability(platform);
    expect(result.available).toBe(true);
  });

  test('returns unavailable for unknown OS', () => {
    const platform: AppleIntelligencePlatform = {
      OS: 'windows',
      Version: '11',
    };
    const result = checkAppleIntelligenceAvailability(platform);
    expect(result.available).toBe(false);
  });
});
