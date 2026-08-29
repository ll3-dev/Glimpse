import { useCallback, useSyncExternalStore } from 'react';

const THEME_KEY = 'glimpse_desktop_theme_v1';

export type ThemePreference = 'system' | 'light' | 'dark';

function readStored(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // storage unavailable — fall through to system
  }
  return 'system';
}

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** `.dark` 클래스 적용 + 시스템 테마 변경 추적. 앱 부팅 시 1회 호출. */
export function initThemePreference(): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const pref = readStored();
    const dark = pref === 'dark' || (pref === 'system' && media.matches);
    document.documentElement.classList.toggle('dark', dark);
  };
  media.addEventListener('change', apply);
  apply();
  // 저장 변경(같은 탭에서의 set 호출)에도 재적용
  window.addEventListener('glimpse-theme-change', apply);
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    // ignore — in-memory only then
  }
  notify();
  window.dispatchEvent(new Event('glimpse-theme-change'));
}

export function useThemePreference(): {
  theme: ThemePreference;
  setTheme: (pref: ThemePreference) => void;
} {
  const theme = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    readStored,
    () => 'system' as const,
  );
  const setTheme = useCallback((pref: ThemePreference) => setThemePreference(pref), []);
  return { theme, setTheme };
}
