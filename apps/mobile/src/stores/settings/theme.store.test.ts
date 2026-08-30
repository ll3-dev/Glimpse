import { afterEach, describe, expect, mock, test } from 'bun:test';

/**
 * 테마 스토어 검증 — preference 변경이 Uniwind.setTheme로 전달되고,
 * MMKV(storage)에 즉시 기록되며, 부팅 시 hydrate로 복원되는지 확인.
 *
 * uniwind 네이티브 모듈(RuntimeThemeVariablesProvider JSI)은 테스트 환경에
 * 없으므로 setTheme가 관찰 가능한 mock으로 교체한다. 실제 모듈의 나머지
 * export(useUniwind 등)는 펼쳐서 유지한다.
 */

const setThemeMock = mock((_theme: string) => {});

const realUniwind = await import('uniwind');
mock.module('uniwind', () => ({
  ...realUniwind,
  Uniwind: {
    ...realUniwind.Uniwind,
    setTheme: setThemeMock,
  },
}));

const { themeStore, THEME_PREFERENCES, ensureThemeHydrated, resetThemeHydrationForTests } =
  await import('./theme.store');
const { storage, StorageKeys } = await import('@/src/lib/storage');

afterEach(() => {
  setThemeMock.mockClear();
  storage.remove(StorageKeys.THEME_PREFERENCE);
  themeStore.getState().actions.setPreference('system');
  resetThemeHydrationForTests();
});

describe('theme store', () => {
  test('기본 preference는 system이다', () => {
    expect(themeStore.getState().preference).toBe('system');
  });

  test('지원 preference 집합은 system/light/dark다', () => {
    expect(THEME_PREFERENCES).toEqual(['system', 'light', 'dark']);
  });

  test('setPreference는 Uniwind.setTheme를 호출한다', () => {
    themeStore.getState().actions.setPreference('dark');
    expect(setThemeMock).toHaveBeenCalledWith('dark');
    expect(themeStore.getState().preference).toBe('dark');
  });

  test('system 선택도 Uniwind.setTheme에 그대로 전달된다', () => {
    themeStore.getState().actions.setPreference('system');
    expect(setThemeMock).toHaveBeenCalledWith('system');
  });

  test('setPreference는 storage에 즉시 기록한다', () => {
    themeStore.getState().actions.setPreference('light');
    expect(storage.getString(StorageKeys.THEME_PREFERENCE)).toBe('light');
  });

  test('hydrate는 저장된 preference를 복원하고 Uniwind에 적용한다', () => {
    storage.set(StorageKeys.THEME_PREFERENCE, 'dark');
    ensureThemeHydrated();
    expect(themeStore.getState().preference).toBe('dark');
    expect(setThemeMock).toHaveBeenCalledWith('dark');
  });

  test('hydrate는 저장값이 없으면 Uniwind를 건드리지 않는다', () => {
    ensureThemeHydrated();
    expect(themeStore.getState().preference).toBe('system');
    expect(setThemeMock).not.toHaveBeenCalled();
  });

  test('저장값이 손상됐으면 기본값으로 복원한다', () => {
    storage.set(StorageKeys.THEME_PREFERENCE, 'hacker-green');
    ensureThemeHydrated();
    expect(themeStore.getState().preference).toBe('system');
    expect(setThemeMock).not.toHaveBeenCalled();
  });

  test('ensureThemeHydrated는 멱등하다', () => {
    storage.set(StorageKeys.THEME_PREFERENCE, 'dark');
    ensureThemeHydrated();
    setThemeMock.mockClear();
    ensureThemeHydrated();
    expect(setThemeMock).not.toHaveBeenCalled();
  });
});
