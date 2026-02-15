import { beforeEach, describe, expect, test } from 'bun:test';
import { createAppleIntelligenceToggle } from './appleIntelligenceToggle';

const platform = {
  OS: 'ios',
  Version: '18.2',
};

const toggle = createAppleIntelligenceToggle({ platform });

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
    expect(toggle.getInferenceProvider()).toBe('apple-intelligence');
  });

  test('setAppleIntelligenceEnabled(false) disables regardless of platform', () => {
    platform.OS = 'ios';
    platform.Version = '18.3';
    toggle.enableAppleIntelligence();
    expect(toggle.isAppleIntelligenceEnabled()).toBe(true);
    expect(toggle.setAppleIntelligenceEnabled(false)).toBe(true);
    expect(toggle.isAppleIntelligenceEnabled()).toBe(false);
    expect(toggle.getInferenceProvider()).toBe('default');
  });

  test('config reflects availability and enabled state', () => {
    platform.OS = 'ios';
    platform.Version = '18.3';
    toggle.enableAppleIntelligence();
    const config = toggle.getAppleIntelligenceConfig();
    expect(config.isAvailable).toBe(true);
    expect(config.enabled).toBe(true);
  });
});
