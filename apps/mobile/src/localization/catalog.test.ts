import { describe, expect, test } from 'bun:test';
import { messages, resolveAppLocale } from '.';

describe('app localization', () => {
  test('uses a supported persisted locale before the system locale', () => {
    expect(resolveAppLocale('en', 'ko-KR')).toBe('en');
    expect(resolveAppLocale('ko', 'en-US')).toBe('ko');
  });

  test('falls back to Korean only for Korean system locales', () => {
    expect(resolveAppLocale(undefined, 'ko-KR')).toBe('ko');
    expect(resolveAppLocale(undefined, 'en-US')).toBe('en');
    expect(resolveAppLocale('invalid', undefined)).toBe('en');
  });

  test('keeps both catalogs structurally aligned', () => {
    expect(Object.keys(messages.ko)).toEqual(Object.keys(messages.en));
    expect(Object.keys(messages.ko.settings)).toEqual(Object.keys(messages.en.settings));
    expect(Object.keys(messages.ko.data)).toEqual(Object.keys(messages.en.data));
  });
});
