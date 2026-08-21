import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { storage, StorageKeys } from '@/src/lib/storage';
import { messages, type AppLocale } from './catalog';

type LocaleState = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

export function resolveAppLocale(
  persistedLocale: string | undefined,
  systemLocale: string | undefined,
): AppLocale {
  if (persistedLocale === 'ko' || persistedLocale === 'en') return persistedLocale;
  return systemLocale?.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

function getSystemLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

const appLocaleStore = createStore<LocaleState>((set) => ({
  locale: resolveAppLocale(storage.getString(StorageKeys.APP_LOCALE), getSystemLocale()),
  setLocale: (locale) => {
    storage.set(StorageKeys.APP_LOCALE, locale);
    set({ locale });
  },
}));

export function useAppLocale() {
  const locale = useStore(appLocaleStore, (state) => state.locale);
  const setLocale = useStore(appLocaleStore, (state) => state.setLocale);
  return { locale, setLocale, messages: messages[locale] };
}

export { messages } from './catalog';
export type { AppLocale, AppMessages } from './catalog';
