import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Text, Switch } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { useReviewReminderScheduler } from '@glimpse/hooks';
import { SettingsSection } from './SettingsSection';
import { ReminderTimeStepper } from './ReminderTimeStepper';
import {
  configureReminderChannel,
  expoReviewReminderScheduler,
  isNotificationSupported,
} from '@/src/features/notifications';
import {
  useReviewReminderSettings,
  useReviewReminderSettingsActions,
} from '@/src/stores/settings/review-reminder.store';
import { useAppLocale } from '@/src/localization';

/**
 * 복습 알림 설정 섹션 — 토글·발화 시각·권한 거부 안내.
 * enable/disable은 공유 훅(컨트롤러)에 위임하고, 거부 시 토글을 되돌린다.
 */
export function ReviewReminderSection() {
  const { messages, locale } = useAppLocale();
  const enabled = useReviewReminderSettings((settings) => settings.enabled);
  const hour = useReviewReminderSettings((settings) => settings.hour);
  const minute = useReviewReminderSettings((settings) => settings.minute);
  const { setEnabled: persistEnabled, setTime } = useReviewReminderSettingsActions();
  const appMuted = useSemanticColor('appMuted');
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // 마운트 동기화 중에는 OS 상태가 토글을 덮어쓰지 않도록 잠근다
  const syncLockedRef = useRef(true);

  // 웹 등 미지원 환경에서는 scheduler를 null로 주입해 토글이 스스로 무력화된다
  const supported = isNotificationSupported();
  const scheduler = useReviewReminderScheduler(
    supported ? expoReviewReminderScheduler : null,
    {
      enabled,
      time: { hour, minute },
      locale: useCallback(() => locale, [locale]),
    },
  );

  useEffect(() => {
    configureReminderChannel(messages.settings.reviewReminderTitle);
  }, [messages]);

  useEffect(() => {
    void scheduler
      .getStatus()
      .then((status) => {
        if (status.scheduled && !enabled) {
          // 마지막 세션의 OS 예약이 남아 있다 — 설정을 실제 상태로 되돌린다
          persistEnabled(true);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        syncLockedRef.current = false;
      });
    // 최초 마운트 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = (next: boolean) => {
    if (busy || syncLockedRef.current) return;
    if (!supported) return;
    setBusy(true);
    setPermissionDenied(false);
    void scheduler
      .setEnabled(next, { hour, minute })
      .then((result) => {
        if (next && !result) {
          // 권한 거부 — 토글 복구 + 안내
          setPermissionDenied(true);
          persistEnabled(false);
          return;
        }
        persistEnabled(next);
      })
      .catch(() => {
        setPermissionDenied(false);
        persistEnabled(enabled);
      })
      .finally(() => setBusy(false));
  };

  const handleTimeChange = (nextHour: number, nextMinute: number) => {
    setTime(nextHour, nextMinute);
    if (enabled) {
      // 시각 변경은 예약을 즉시 다시 잡는다 (due 캐시 변화와 무관)
      void scheduler.setEnabled(true, { hour: nextHour, minute: nextMinute }).catch(() => undefined);
    }
  };

  return (
    <SettingsSection
      title={messages.settings.reviewReminderTitle}
      icon={<Bell size={18} color={appMuted} />}
      footer={
        permissionDenied
          ? messages.settings.reviewReminderDenied
          : messages.settings.reviewReminderFooter
      }
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-app-text">
            {messages.settings.reviewReminderEnable}
          </Text>
        </View>
        <Switch
          accessibilityLabel={messages.settings.reviewReminderEnable}
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </View>

      {enabled && (
        <View className="border-app-border mt-3 rounded-xl border p-3">
          <Text className="text-app-muted mb-1 text-xs font-semibold uppercase tracking-tight">
            {messages.settings.reviewReminderTime}
          </Text>
          <ReminderTimeStepper
            label={messages.settings.reviewReminderHour}
            value={hour}
            minValue={0}
            maxValue={23}
            onChange={(next) => handleTimeChange(next, minute)}
          />
          <ReminderTimeStepper
            label={messages.settings.reviewReminderMinute}
            value={minute}
            minValue={0}
            maxValue={59}
            onChange={(next) => handleTimeChange(hour, next)}
          />
          <Text className="text-app-subtle mt-1 text-[11px]">
            {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
          </Text>
        </View>
      )}
    </SettingsSection>
  );
}
