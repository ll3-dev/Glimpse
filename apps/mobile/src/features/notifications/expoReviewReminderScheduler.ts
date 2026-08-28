import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ReviewReminderScheduler } from '@glimpse/features';

const ANDROID_CHANNEL_ID = 'review-reminder';
/** 이 앱이 예약하는 유일한 알림 분류 — OS 목록에서 우리 것을 찾는 기준. */
const REMINDER_NOTIFICATION_TITLE = 'Glimpse';
const DEFAULT_CHANNEL_NAME = '복습 알림';

/** 알림 채널 표시 이름 — 어댑터는 React 컨텍스트가 없어 UI 쪽에서 현지화명을 주입한다. */
let channelDisplayName: string | null = null;

export function configureReminderChannel(name: string): void {
  channelDisplayName = name;
}

/** 웹/미지원 환경 가드. */
export function isNotificationSupported(): boolean {
  return Platform.OS !== 'web';
}

function isDailyReminderTrigger(trigger: unknown): trigger is { hour?: number; minute?: number } {
  return (
    typeof trigger === 'object' &&
    trigger !== null &&
    (trigger as { type?: unknown }).type === Notifications.SchedulableTriggerInputTypes.DAILY
  );
}

type ScheduledReminder = {
  identifier: string;
  hour?: number;
  minute?: number;
};

/** OS 예약 목록에서 이 앱의 리마인더 알림만 골라낸다. */
async function listScheduledReminders(): Promise<ScheduledReminder[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all
    .filter((n) => n.content.title === REMINDER_NOTIFICATION_TITLE)
    .map((n) => {
      const trigger = isDailyReminderTrigger(n.trigger) ? n.trigger : undefined;
      return {
        identifier: n.identifier,
        hour: trigger?.hour,
        minute: trigger?.minute,
      };
    });
}

/** 예약 전 OS 상태와 재동기화한다. 모듈 상태는 재시작을 못 넘는다 — OS가 진실의 원천. */
async function cancelScheduledReminders(): Promise<void> {
  const reminders = await listScheduledReminders();
  await Promise.all(
    reminders.map((r) =>
      Notifications.cancelScheduledNotificationAsync(r.identifier).catch(() => undefined),
    ),
  );
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
    // 이전 세션의 잔존 예약을 먼저 정리한다 — expo DAILY 트리거는 중복을 걸러주지 않는다
    await cancelScheduledReminders();
    await Notifications.scheduleNotificationAsync({
      content: { title: REMINDER_NOTIFICATION_TITLE, body, sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  },
  async cancel() {
    // 취소도 OS에서 재동기화 — 마지막 세션의 예약까지 확실히 지운다
    await cancelScheduledReminders();
  },
  async getStatus() {
    const reminders = await listScheduledReminders();
    const first = reminders[0];
    if (!first) return { scheduled: false };
    return {
      scheduled: true,
      hour: first.hour,
      minute: first.minute,
    };
  },
};

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: channelDisplayName ?? DEFAULT_CHANNEL_NAME,
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => undefined);
}
