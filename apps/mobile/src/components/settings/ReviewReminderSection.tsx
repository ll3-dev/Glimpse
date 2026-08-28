import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Text, Switch } from '@glimpse/ui/primitives';
import { useSemanticColor } from '@glimpse/ui';
import { useReviewReminderScheduler } from '@glimpse/hooks';
import { SettingsSection } from './SettingsSection';
import { ReminderTimeStepper } from './ReminderTimeStepper';
import { expoReviewReminderScheduler } from '@/src/features/notifications';
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

  const scheduler = useReviewReminderScheduler(expoReviewReminderScheduler, {
    enabled,
    time: { hour, minute },
    locale: useCallback(() => locale, [locale]),
  });

  // 마운트 직후 OS 예약 상태를 반영(스토어 enabled과 무관하게 표시 동기화)
  useEffect(() => {
    void scheduler
      .getStatus()
      .then((status) => {
        if (status.scheduled && !enabled) {
          persistEnabled(true);
        }
      })
      .catch(() => undefined);
    // 최초 마운트 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = (next: boolean) => {
    if (busy) return;
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
      // 예약 갱신은 훅의 due 캐시 이펙트가 처리하지만, 시각 변경은 즉시 반영한다
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
            label="H"
            value={hour}
            unit=""
            minValue={0}
            maxValue={23}
            onChange={(next) => handleTimeChange(next, minute)}
          />
          <ReminderTimeStepper
            label="M"
            value={minute}
            unit=""
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
