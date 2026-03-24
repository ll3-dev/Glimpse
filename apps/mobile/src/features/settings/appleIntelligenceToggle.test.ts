import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { createAppleIntelligenceToggle } from './appleIntelligenceToggle';
import type { AppleIntelligenceBridge } from '@/src/features/ai/apple-intelligence-bridge';

const platform = {
  OS: 'ios',
  Version: '18.2',
};

function createBridge(
  overrides: Partial<AppleIntelligenceBridge> = {},
): AppleIntelligenceBridge {
  return {
    isAvailable: mock(async () => ({ available: true as const })),
    generate: mock(async () => ({ text: 'unused' })),
    ...overrides,
  };
}

const bridge = createBridge();
const toggle = createAppleIntelligenceToggle({ platform, bridge });

describe('appleIntelligenceToggle', () => {
  beforeEach(() => {
    platform.OS = 'ios';
    platform.Version = '18.2';
    toggle.disableAppleIntelligence();
  });

  test('is unavailable on non-Apple platforms', () => {
    platform.OS = 'android';
    const availability = toggle.checkAppleIntelligenceAvailability();
    expect(availability.available).toBe(false);
    expect(availability.reason).toContain('Apple 기기');
  });

  test('is unavailable on old iOS version', () => {
    platform.OS = 'ios';
    platform.Version = '18.0';
    const availability = toggle.checkAppleIntelligenceAvailability();
    expect(availability.available).toBe(false);
    expect(availability.reason).toContain('iOS 18.1');
  });

  test('enables on supported iOS versions', () => {
    platform.OS = 'ios';
    platform.Version = '18.3';
    expect(toggle.enableAppleIntelligence()).toBe(true);
    expect(toggle.isAppleIntelligenceEnabled()).toBe(true);
  });

  test('setAppleIntelligenceEnabled(false) disables regardless of platform', () => {
    platform.OS = 'ios';
    platform.Version = '18.3';
    toggle.enableAppleIntelligence();
    expect(toggle.isAppleIntelligenceEnabled()).toBe(true);
    expect(toggle.setAppleIntelligenceEnabled(false)).toBe(true);
    expect(toggle.isAppleIntelligenceEnabled()).toBe(false);
  });

  test('config reflects availability and enabled state', () => {
    platform.OS = 'ios';
    platform.Version = '18.3';
    toggle.enableAppleIntelligence();
    const config = toggle.getAppleIntelligenceConfig();
    expect(config.isAvailable).toBe(false);
    expect(config.isCheckingAvailability).toBe(true);
    expect(config.enabled).toBe(false);
  });

  test('resolveAppleIntelligenceAvailability returns unsupported device from native bridge', async () => {
    const unsupportedDeviceToggle = createAppleIntelligenceToggle({
      platform,
      bridge: createBridge({
        isAvailable: mock(async () => ({
          available: false,
          reason: 'unsupported_device',
        })),
      }),
    });

    const availability = await unsupportedDeviceToggle.resolveAppleIntelligenceAvailability();

    expect(availability.available).toBe(false);
    expect(availability.reasonCode).toBe('unsupported_device');
    expect(availability.reason).toBe('이 기기는 Apple Intelligence를 지원하지 않습니다');
  });

  test('resolveAppleIntelligenceAvailability keeps supported devices available', async () => {
    platform.OS = 'ios';
    platform.Version = '18.3';

    const availability = await toggle.resolveAppleIntelligenceAvailability();

    expect(availability).toEqual({ available: true });
  });

  test('resolveAppleIntelligenceAvailability returns setup guidance when native is not configured', async () => {
    const unavailableToggle = createAppleIntelligenceToggle({
      platform,
      bridge: createBridge({
        isAvailable: mock(async () => ({
          available: false,
          reason: 'not_configured',
        })),
      }),
    });

    const availability = await unavailableToggle.resolveAppleIntelligenceAvailability();

    expect(availability.available).toBe(false);
    expect(availability.reasonCode).toBe('not_configured');
    expect(availability.reason).toContain('기기 설정');
  });
});
