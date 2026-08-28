import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { DEFAULT_REMINDER_TIME, type ReminderTime } from '@glimpse/features';

/**
 * 데스크톱 복습 리마인더 설정 — 모바일 review-reminder.store.ts의 localStorage 버전.
 * 데스크톱에는 KeyValueStorage 계약이 없어 기존 settings-storage와 같이
 * localStorage + try/catch로 직접 저장한다.
 */

const SETTINGS_KEY = 'review_reminder_settings';

export interface ReviewReminderSettings {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
}

export const DEFAULT_REVIEW_REMINDER_SETTINGS: ReviewReminderSettings = {
  enabled: false,
  hour: DEFAULT_REMINDER_TIME.hour,
  minute: DEFAULT_REMINDER_TIME.minute,
};

/** 0-23 / 0-59 범위로 보정한다. 저장소 값이 손상됐을 때의 방어. */
export function sanitizeReminderTime(hour: unknown, minute: unknown): ReminderTime {
  const safeHour =
    typeof hour === 'number' && Number.isFinite(hour) ? Math.floor(hour) : DEFAULT_REMINDER_TIME.hour;
  const safeMinute =
    typeof minute === 'number' && Number.isFinite(minute)
      ? Math.floor(minute)
      : DEFAULT_REMINDER_TIME.minute;
  return {
    hour: Math.min(23, Math.max(0, safeHour)),
    minute: Math.min(59, Math.max(0, safeMinute)),
  };
}

function loadPersistedSettings(): ReviewReminderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_REVIEW_REMINDER_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ReviewReminderSettings>;
    const time = sanitizeReminderTime(parsed.hour, parsed.minute);
    return {
      enabled: parsed.enabled === true,
      hour: time.hour,
      minute: time.minute,
    };
  } catch {
    return { ...DEFAULT_REVIEW_REMINDER_SETTINGS };
  }
}

function persistSettings(settings: ReviewReminderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 저장 실패는 치명적이지 않다 — 세션 내 상태는 유지된다
  }
}

export const reviewReminderStore = createStore<{
  settings: ReviewReminderSettings;
  setEnabled: (enabled: boolean) => void;
  setTime: (hour: number, minute: number) => void;
}>((set) => ({
  settings: loadPersistedSettings(),
  setEnabled: (enabled) => {
    set((state) => {
      const next = { ...state.settings, enabled };
      persistSettings(next);
      return { settings: next };
    });
  },
  setTime: (hour, minute) => {
    set((state) => {
      const time = sanitizeReminderTime(hour, minute);
      const next = { ...state.settings, hour: time.hour, minute: time.minute };
      persistSettings(next);
      return { settings: next };
    });
  },
}));

export function useReviewReminderSettings<T>(selector: (settings: ReviewReminderSettings) => T): T {
  return useStore(reviewReminderStore, (state) => selector(state.settings));
}

// 원시 선택자로 개별 구독 — 객체 스냅샷을 새로 만드는 선택자는 금지(zustand v5)
export function useReviewReminderSetEnabled(): (enabled: boolean) => void {
  return useStore(reviewReminderStore, (state) => state.setEnabled);
}

export function useReviewReminderSetTime(): (hour: number, minute: number) => void {
  return useStore(reviewReminderStore, (state) => state.setTime);
}
