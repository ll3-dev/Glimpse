import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
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

type TimePreset = 'morning' | 'afternoon' | 'evening' | 'custom';

export function ReviewReminderSection() {
  const { messages, locale } = useAppLocale();
  const enabled = useReviewReminderSettings((settings) => settings.enabled);
  const hour = useReviewReminderSettings((settings) => settings.hour);
  const minute = useReviewReminderSettings((settings) => settings.minute);
  const { setEnabled: persistEnabled, setTime } = useReviewReminderSettingsActions();
  const appMuted = useSemanticColor('appMuted');
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const syncLockedRef = useRef(true);

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
      void scheduler.setEnabled(true, { hour: nextHour, minute: nextMinute }).catch(() => undefined);
    }
  };

  const getActivePreset = (): TimePreset => {
    if (hour === 9 && minute === 0) return 'morning';
    if (hour === 13 && minute === 0) return 'afternoon';
    if (hour === 20 && minute === 0) return 'evening';
    return 'custom';
  };

  const activePreset = getActivePreset();

  const presets: { id: TimePreset; label: string; hour: number; minute: number }[] = [
    { id: 'morning', label: messages.settings.presetMorning, hour: 9, minute: 0 },
    { id: 'afternoon', label: messages.settings.presetAfternoon, hour: 13, minute: 0 },
    { id: 'evening', label: messages.settings.presetEvening, hour: 20, minute: 0 },
  ];

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
          <Text className="text-xs text-app-muted mt-0.5">
            지정한 시간에 복습할 노트를 리마인드합니다
          </Text>
        </View>
        <Switch
          accessibilityLabel={messages.settings.reviewReminderEnable}
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </View>

      {enabled && (
        <View className="mt-3 pt-3 border-t border-app-border/60">
          <Text className="text-app-muted mb-2 text-xs font-semibold uppercase tracking-tight">
            {messages.settings.reviewReminderTime}
          </Text>

          {/* Quick preset chips */}
          <View className="flex-row flex-wrap gap-2 mb-1">
            {presets.map((preset) => {
              const selected = activePreset === preset.id;
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  accessibilityLabel={preset.label}
                  onPress={() => {
                    setIsCustomExpanded(false);
                    handleTimeChange(preset.hour, preset.minute);
                  }}
                  className={`min-h-9 px-3 py-1.5 rounded-lg border active:opacity-80 justify-center ${
                    selected
                      ? 'border-app-text bg-app-text'
                      : 'border-transparent bg-app-bg/60'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      selected ? 'text-white' : 'text-app-text'
                    }`}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={messages.settings.presetCustom}
              onPress={() => setIsCustomExpanded((prev) => !prev)}
              className={`min-h-9 px-3 py-1.5 rounded-lg border active:opacity-80 justify-center ${
                activePreset === 'custom' || isCustomExpanded
                  ? 'border-app-text bg-app-text'
                  : 'border-transparent bg-app-bg/60'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  activePreset === 'custom' || isCustomExpanded ? 'text-white' : 'text-app-text'
                }`}
              >
                {activePreset === 'custom'
                  ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                  : messages.settings.presetCustom}
              </Text>
            </Pressable>
          </View>

          {/* Fine-grained custom stepper when custom is selected or expanded */}
          {(activePreset === 'custom' || isCustomExpanded) && (
            <View className="mt-2 pt-2 border-t border-app-border/40">
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
            </View>
          )}
        </View>
      )}
    </SettingsSection>
  );
}
