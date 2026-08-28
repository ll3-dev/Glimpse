import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ReviewReminderScheduler } from '@glimpse/features';

const ANDROID_CHANNEL_ID = 'review-reminder';
let scheduledIdentifier: string | null = null;

/** 웹/미지원 환경 가드. */
export function isNotificationSupported(): boolean {
  return Platform.OS !== 'web';
}

export const expoReviewReminderScheduler: ReviewReminderScheduler = {
  async requestPermission() {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    if (!settings.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  },
  async scheduleDaily(time, body) {
    await ensureAndroidChannel();
    if (scheduledIdentifier) {
      await Notifications.cancelScheduledNotificationAsync(scheduledIdentifier).catch(
        () => undefined,
      );
      scheduledIdentifier = null;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: 'Glimpse', body, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
    scheduledIdentifier = id;
  },
  async cancel() {
    if (scheduledIdentifier) {
      await Notifications.cancelScheduledNotificationAsync(scheduledIdentifier).catch(
        () => undefined,
      );
      scheduledIdentifier = null;
    }
  },
  async getStatus() {
    if (!scheduledIdentifier) return { scheduled: false };
    return { scheduled: true };
  },
};

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: '복습 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => undefined);
}
