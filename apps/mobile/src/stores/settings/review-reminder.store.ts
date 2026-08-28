import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { ReminderTime } from '@glimpse/features';
import { DEFAULT_REMINDER_TIME } from '@glimpse/features';
import { storage, StorageKeys } from '@/src/lib/storage';

/**
 * 복습 리마인더 설정 — 하루 1회 요약 알림의 on/off와 발화 시각.
 * vanilla store + KeyValueStorage(MMKV) 즉시 기록 패턴.
 */

export interface ReviewReminderSettings {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface ReviewReminderStoreState {
  settings: ReviewReminderSettings;
  actions: {
    hydrate: () => void;
    setEnabled: (enabled: boolean) => void;
    setTime: (hour: number, minute: number) => void;
  };
}

export const DEFAULT_REVIEW_REMINDER_SETTINGS: ReviewReminderSettings = {
  enabled: false,
  hour: DEFAULT_REMINDER_TIME.hour,
  minute: DEFAULT_REMINDER_TIME.minute,
};

/** 0-23 / 0-59 범위로 보정한다. 저장소 값이 손상됐을 때의 방어. */
export function sanitizeReminderTime(hour: unknown, minute: unknown): ReminderTime {
  const safeHour = typeof hour === 'number' && Number.isFinite(hour) ? Math.floor(hour) : DEFAULT_REMINDER_TIME.hour;
  const safeMinute =
    typeof minute === 'number' && Number.isFinite(minute) ? Math.floor(minute) : DEFAULT_REMINDER_TIME.minute;
  return {
    hour: Math.min(23, Math.max(0, safeHour)),
    minute: Math.min(59, Math.max(0, safeMinute)),
  };
}

function loadPersistedSettings(): ReviewReminderSettings {
  if (!storage.contains(StorageKeys.REVIEW_REMINDER_ENABLED)) {
    return { ...DEFAULT_REVIEW_REMINDER_SETTINGS };
  }
  const time = sanitizeReminderTime(
    storage.getNumber(StorageKeys.REVIEW_REMINDER_HOUR),
    storage.getNumber(StorageKeys.REVIEW_REMINDER_MINUTE),
  );
  return {
    enabled: storage.getBoolean(StorageKeys.REVIEW_REMINDER_ENABLED) ?? false,
    hour: time.hour,
    minute: time.minute,
  };
}

export const reviewReminderStore: StoreApi<ReviewReminderStoreState> = createStore<ReviewReminderStoreState>(
  (set) => ({
    settings: { ...DEFAULT_REVIEW_REMINDER_SETTINGS },
    actions: {
      hydrate: () => {
        set({ settings: loadPersistedSettings() });
      },
      setEnabled: (enabled) => {
        storage.set(StorageKeys.REVIEW_REMINDER_ENABLED, enabled);
        set((state) => ({ settings: { ...state.settings, enabled } }));
      },
      setTime: (hour, minute) => {
        const time = sanitizeReminderTime(hour, minute);
        storage.set(StorageKeys.REVIEW_REMINDER_HOUR, time.hour);
        storage.set(StorageKeys.REVIEW_REMINDER_MINUTE, time.minute);
        set((state) => ({ settings: { ...state.settings, hour: time.hour, minute: time.minute } }));
      },
    },
  }),
);

export function useReviewReminderSettings<T>(selector: (settings: ReviewReminderSettings) => T): T {
  return useStore(reviewReminderStore, (state) => selector(state.settings));
}

export function useReviewReminderSettingsActions() {
  return useStore(reviewReminderStore, (state) => state.actions);
}

let hydrated = false;

/** 앱 시작 시 1회 저장된 설정을 복원한다(멱등). */
export function ensureReviewReminderHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  reviewReminderStore.getState().actions.hydrate();
}
