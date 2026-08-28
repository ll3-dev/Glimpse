import { useStore } from 'zustand';
import { useReviewReminderScheduler } from '@glimpse/hooks';
import { tauriReviewReminderScheduler } from '@/features/notifications';
import {
  reviewReminderStore,
} from '@/features/notifications/review-reminder-settings.store';

/**
 * 데스크톱 복습 리마인더 훅 마운트 — localStorage 설정으로 예약을 복원하고
 * due 캐시 변화에 다음 발화 본문을 갱신한다.
 */
export function useAppReviewReminder(): void {
  // 원시 값 선택자로만 구독 — 객체 스냅샷을 새로 만드는 선택자는 금지(zustand v5)
  const enabled = useStore(reviewReminderStore, (state) => state.settings.enabled);
  const hour = useStore(reviewReminderStore, (state) => state.settings.hour);
  const minute = useStore(reviewReminderStore, (state) => state.settings.minute);

  useReviewReminderScheduler(tauriReviewReminderScheduler, {
    enabled,
    time: { hour, minute },
    locale: () => 'ko',
  });
}
