import { useStore } from 'zustand';
import { useReviewReminderScheduler } from '@glimpse/hooks';
import {
  expoReviewReminderScheduler,
  isNotificationSupported,
} from '@/src/features/notifications';
import {
  ensureReviewReminderHydrated,
  reviewReminderStore,
} from '@/src/stores/settings/review-reminder.store';
import { useAppLocale } from '@/src/localization';

/**
 * 복습 리마인더 훅 마운트 — 저장된 설정으로 예약을 복원하고 due 캐시 변화에
 * 다음 발화 본문을 갱신한다. 복습 mutation의 due 쿼리 무효화만으로 반응한다.
 */
export function useAppReviewReminder(): void {
  ensureReviewReminderHydrated();

  // 원시 값 선택자로만 구독 — 객체 스냅샷을 새로 만드는 선택자는 금지(zustand v5)
  const enabled = useStore(reviewReminderStore, (state) => state.settings.enabled);
  const hour = useStore(reviewReminderStore, (state) => state.settings.hour);
  const minute = useStore(reviewReminderStore, (state) => state.settings.minute);
  const locale = useAppLocale().locale;

  useReviewReminderScheduler(
    isNotificationSupported() ? expoReviewReminderScheduler : null,
    {
      enabled,
      time: { hour, minute },
      locale: () => locale,
    },
  );
}
