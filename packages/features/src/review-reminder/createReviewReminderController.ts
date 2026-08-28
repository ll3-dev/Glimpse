import { buildReminderMessage, type ReminderLocale } from './message';
import { DEFAULT_REMINDER_TIME, type ReminderTime } from './schedule';
import type { ReviewReminderControllerDeps, ReviewReminderScheduler } from './types';

export interface ReviewReminderController {
  enable(time: ReminderTime): Promise<boolean>;
  /** 복습 mutation 성공·포그라운드 전환 후 현재 due 개수로 갱신. disable 후엔 no-op. */
  refresh(time: ReminderTime): Promise<void>;
  disable(): Promise<void>;
}

export function createReviewReminderController(deps: ReviewReminderControllerDeps): ReviewReminderController {
  const scheduler: ReviewReminderScheduler = deps.scheduler;
  const getDueCount = deps.getDueCount;
  const getLocale = deps.locale ?? ((): ReminderLocale => 'ko');
  let disabled = false;
  let time: ReminderTime = { ...DEFAULT_REMINDER_TIME };

  /** 현재 due 개수로 예약을 다시 잡는다. enable과 refresh가 공유한다. */
  const scheduleCurrent = async (next: ReminderTime): Promise<void> => {
    time = next;
    if (disabled) return;
    const count = await getDueCount();
    if (count <= 0) {
      // due가 없으면 알림을 보내지 않도록 취소만 해둔다 (예약 슬롯 절약)
      await scheduler.cancel();
      return;
    }
    const body = buildReminderMessage(getLocale(), count);
    if (body) await scheduler.scheduleDaily(time, body);
  };

  return {
    async enable(next) {
      time = next;
      const granted = await scheduler.requestPermission();
      if (!granted) return false;
      disabled = false;
      await scheduleCurrent(next);
      return true;
    },
    async refresh(next) {
      await scheduleCurrent(next);
    },
    async disable() {
      disabled = true;
      await scheduler.cancel();
    },
  };
}
