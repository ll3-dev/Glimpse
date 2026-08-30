import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { Uniwind } from 'uniwind';
import { storage, StorageKeys } from '@/src/lib/storage';

/**
 * 테마 preference — system/light/dark 3종 선택을 uniwind에 적용하고 MMKV에
 * 기록한다. 'system'은 uniwind의 SYSTEM_THEME로 OS 다크 모드를 따르며,
 * light/dark 선택은 Appearance.setColorScheme까지 고정한다(uniwind가 처리).
 *
 * vanilla store + KeyValueStorage(MMKV) 즉시 기록 패턴
 * (review-reminder.store, localization/index와 동일).
 */

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

export interface ThemeStoreState {
  preference: ThemePreference;
  actions: {
    hydrate: (persisted: string | undefined) => void;
    setPreference: (preference: ThemePreference) => void;
  };
}

/** 저장값 검증 — 손상된 값은 기본값(system)으로 복원한다. */
export function sanitizeThemePreference(persisted: string | undefined): ThemePreference {
  return THEME_PREFERENCES.includes(persisted as ThemePreference)
    ? (persisted as ThemePreference)
    : DEFAULT_THEME_PREFERENCE;
}

function applyPreference(preference: ThemePreference): void {
  Uniwind.setTheme(preference);
}

export const themeStore: StoreApi<ThemeStoreState> = createStore<ThemeStoreState>((set) => ({
  preference: DEFAULT_THEME_PREFERENCE,
  actions: {
    hydrate: (persisted) => {
      const preference = sanitizeThemePreference(persisted);
      set({ preference });
      // 부팅 직후 플래시 방지 — 저장값이 system이 아니면 즉시 고정.
      // system이면 uniwind 기본(Appearance 추종)을 유지한다.
      if (preference !== DEFAULT_THEME_PREFERENCE) {
        applyPreference(preference);
      }
    },
    setPreference: (preference) => {
      storage.set(StorageKeys.THEME_PREFERENCE, preference);
      applyPreference(preference);
      set({ preference });
    },
  },
}));

export function useThemePreference<T>(selector: (preference: ThemePreference) => T): T {
  return useStore(themeStore, (state) => selector(state.preference));
}

export function useThemePreferenceActions() {
  return useStore(themeStore, (state) => state.actions);
}

let hydrated = false;

/** 앱 시작 시 1회 저장된 preference를 복원한다(멱등). */
export function ensureThemeHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  themeStore.getState().actions.hydrate(storage.getString(StorageKeys.THEME_PREFERENCE));
}

/** 테스트 전용 — hydrate 1회성 초기화. */
export function resetThemeHydrationForTests(): void {
  hydrated = false;
}
