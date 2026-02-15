import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

const platform = {
  OS: 'ios',
  Version: '18.2',
};

mock.module('react-native', () => ({
  Platform: platform,
}));

const {
  checkAppleIntelligenceAvailability,
  disableAppleIntelligence,
  enableAppleIntelligence,
  getAppleIntelligenceConfig,
  getInferenceProvider,
  isAppleIntelligenceEnabled,
  setAppleIntelligenceEnabled,
} = await import('./appleIntelligenceToggle');

describe('appleIntelligenceToggle', () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    platform.OS = 'ios';
    platform.Version = '18.2';
    disableAppleIntelligence();
  });

  test('is unavailable on non-Apple platforms', () => {
    platform.OS = 'android';
    const availability = checkAppleIntelligenceAvailability();
    expect(availability.available).toBe(false);
    expect(availability.reason).toContain('Apple 기기');
  });

  test('is unavailable on old iOS version', () => {
    platform.OS = 'ios';
    platform.Version = '18.0';
    const availability = checkAppleIntelligenceAvailability();
    expect(availability.available).toBe(false);
    expect(availability.reason).toContain('iOS 18.1');
  });

  test('enables on supported iOS versions', () => {
    platform.OS = 'ios';
    platform.Version = '18.3';
    expect(enableAppleIntelligence()).toBe(true);
    expect(isAppleIntelligenceEnabled()).toBe(true);
    expect(getInferenceProvider()).toBe('apple-intelligence');
  });

  test('setAppleIntelligenceEnabled(false) disables regardless of platform', () => {
    platform.OS = 'ios';
    platform.Version = '18.3';
    enableAppleIntelligence();
    expect(isAppleIntelligenceEnabled()).toBe(true);
    expect(setAppleIntelligenceEnabled(false)).toBe(true);
    expect(isAppleIntelligenceEnabled()).toBe(false);
    expect(getInferenceProvider()).toBe('default');
  });

  test('config reflects availability and enabled state', () => {
    platform.OS = 'ios';
    platform.Version = '18.3';
    enableAppleIntelligence();
    const config = getAppleIntelligenceConfig();
    expect(config.isAvailable).toBe(true);
    expect(config.enabled).toBe(true);
  });
});
