import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { computeNextFireAt, type ReviewReminderScheduler } from '@glimpse/features';

let timerId: ReturnType<typeof setTimeout> | null = null;

/**
 * 데스크톱은 상시 실행 앱이므로 scheduleDaily를 "다음 발화 시각까지 대기 후
 * 발사"로 근사한다. 앱 종료 시 타이머는 소멸한다(설계 허용).
 */
export const tauriReviewReminderScheduler: ReviewReminderScheduler = {
  async requestPermission() {
    const granted = await isPermissionGranted();
    if (granted) return true;
    return (await requestPermission()) === 'granted';
  },
  async scheduleDaily(time, body) {
    if (timerId) clearTimeout(timerId);
    const delay = Math.max(0, computeNextFireAt(Date.now(), time.hour, time.minute) - Date.now());
    timerId = setTimeout(() => {
      timerId = null;
      void (async () => {
        // 발화 시점에 권한이 유지되어 있을 때만 보낸다
        if (await isPermissionGranted()) {
          await sendNotification({ title: 'Glimpse', body });
        }
      })();
    }, delay);
  },
  async cancel() {
    if (timerId) clearTimeout(timerId);
    timerId = null;
  },
  async getStatus() {
    return { scheduled: timerId !== null };
  },
};
