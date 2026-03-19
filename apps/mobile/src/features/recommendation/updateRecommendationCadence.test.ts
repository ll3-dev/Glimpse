import { describe, expect, test } from 'bun:test';
import {
  CADENCE,
  calculateResponseRate,
  determineCadenceLevel,
  getCadence,
  getCadenceInterval,
  shouldShowRecommendation,
} from './updateRecommendationCadence';

describe('updateRecommendationCadence', () => {
  test('calculateResponseRate returns default when no events', () => {
    expect(calculateResponseRate([])).toBe(0.5);
  });

  test('calculateResponseRate counts only accept actions', () => {
    const events = [
      { action: 'accept' as const },
      { action: 'ignore' as const },
      { action: 'dismiss' as const },
      { action: 'accept' as const },
    ];

    expect(calculateResponseRate(events)).toBe(0.5);
  });

  test('determineCadenceLevel respects threshold boundaries', () => {
    expect(determineCadenceLevel(0.6)).toBe('HIGH');
    expect(determineCadenceLevel(0.59)).toBe('MEDIUM');
    expect(determineCadenceLevel(0.3)).toBe('MEDIUM');
    expect(determineCadenceLevel(0.29)).toBe('LOW');
  });

  test('getCadenceInterval maps each level to configured value', () => {
    expect(getCadenceInterval('HIGH')).toBe(CADENCE.HIGH);
    expect(getCadenceInterval('MEDIUM')).toBe(CADENCE.MEDIUM);
    expect(getCadenceInterval('LOW')).toBe(CADENCE.LOW);
  });

  test('shouldShowRecommendation returns true for null baseline', () => {
    expect(shouldShowRecommendation(null)).toBe(true);
  });

  test('shouldShowRecommendation checks elapsed time against current cadence', () => {
    const fixedNow = 1_700_000_000_000;
    const originalNow = Date.now;
    Date.now = () => fixedNow;

    try {
      const cadence = getCadence();
      expect(shouldShowRecommendation(fixedNow - cadence - 1)).toBe(true);
      expect(shouldShowRecommendation(fixedNow - cadence + 1)).toBe(false);
    } finally {
      Date.now = originalNow;
    }
  });
});
