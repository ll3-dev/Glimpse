import { buildReminderMessage, type ReminderLocale } from './message';
import { DEFAULT_REMINDER_TIME, shouldReschedule, type ReminderTime } from './schedule';
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
  const logger = deps.logger;
  let disabled = false;
  let time: ReminderTime = { ...DEFAULT_REMINDER_TIME };
  // 이전 예약과 동일하면 scheduleDaily 재호출을 건너뛰기 위한 추적
  let lastScheduled: { time: ReminderTime; body: string } | null = null;
  // disable/enable로 세대를 올려 대기 중이던 갱신이 예약을 부활시키지 못하게 한다
  let generation = 0;

  /** 현재 due 개수로 예약을 다시 잡는다. enable과 refresh가 공유한다. */
  const scheduleCurrent = async (next: ReminderTime): Promise<void> => {
    const gen = generation;
    time = next;
    if (disabled) return;
    try {
      const count = await getDueCount();
      if (gen !== generation || disabled) return;
      if (count <= 0) {
        // due가 없으면 알림을 보내지 않도록 취소만 해둔다 (예약 슬롯 절약)
        lastScheduled = null;
        await scheduler.cancel();
        return;
      }
      const body = buildReminderMessage(getLocale(), count);
      if (!body) return;
      if (lastScheduled && !shouldReschedule(lastScheduled.time, next) && lastScheduled.body === body) {
        return; // 동일 예약 — 중복 scheduleDaily 생략
      }
      await scheduler.scheduleDaily(next, body);
      if (gen !== generation || disabled) {
        // 예약 직후 disable되었다면 해제 (레이스 정리)
        await scheduler.cancel();
        return;
      }
      lastScheduled = { time: next, body };
    } catch (error) {
      logger?.error('review-reminder: 스케줄 갱신 실패', error);
    }
  };

  return {
    async enable(next) {
      generation += 1;
      disabled = false;
      time = next;
      const granted = await scheduler.requestPermission();
      if (!granted) return false;
      await scheduleCurrent(next);
      return true;
    },
    async refresh(next) {
      await scheduleCurrent(next);
    },
    async disable() {
      generation += 1;
      disabled = true;
      lastScheduled = null;
      await scheduler.cancel();
    },
  };
}
