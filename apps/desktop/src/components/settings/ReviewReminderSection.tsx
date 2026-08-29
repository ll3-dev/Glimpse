import { useCallback, useState } from 'react';
import { Bell, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useReviewReminderScheduler } from '@glimpse/hooks';
import { tauriReviewReminderScheduler } from '@/features/notifications';
import {
  useReviewReminderSettings,
  useReviewReminderSetEnabled,
  useReviewReminderSetTime,
} from '@/features/notifications/review-reminder-settings.store';

/**
 * 복습 알림 설정 섹션(데스크톱) — 토글·발화 시각 스테퍼.
 * enable/disable은 공유 훅(컨트롤러)에 위임하고, 거부 시 토글을 되돌린다.
 */
export function ReviewReminderSection() {
  const enabled = useReviewReminderSettings((settings) => settings.enabled);
  const hour = useReviewReminderSettings((settings) => settings.hour);
  const minute = useReviewReminderSettings((settings) => settings.minute);
  const setEnabled = useReviewReminderSetEnabled();
  const setTime = useReviewReminderSetTime();
  const [busy, setBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // catch 경로에서 되돌릴 마지막 확정 상태 (렌더 중 ref 접근 금지 규칙 준수)
  const [lastConfirmedEnabled, setLastConfirmedEnabled] = useState(enabled);

  const scheduler = useReviewReminderScheduler(tauriReviewReminderScheduler, {
    enabled,
    time: { hour, minute },
    locale: useCallback(() => 'ko', []),
  });

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
          setEnabled(false);
          return;
        }
        setLastConfirmedEnabled(next);
        setEnabled(next);
      })
      .catch(() => {
        setPermissionDenied(false);
        setEnabled(lastConfirmedEnabled);
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
    <section>
      <div className="mb-3 flex items-center gap-1.5">
        <Bell className="h-4 w-4 text-app-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          복습 알림 설정 (Reminders)
        </h2>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">매일 알림 받기</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              매일 지정한 시간에 복습할 지식 항목 수를 데스크톱 알림으로 전달합니다.
            </p>
          </div>
          <Switch
            aria-label="복습 알림 사용"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {permissionDenied && (
          <p className="mt-3 text-xs text-destructive">
            시스템 알림 권한이 비활성화되어 있습니다. OS 알림 설정에서 권한을 허용해 주세요.
          </p>
        )}

        {enabled && (
          <div className="mt-5 space-y-3 rounded-xl border border-border/80 bg-background/80 p-4">
            <p className="text-xs font-semibold text-muted-foreground">알림 예약 시각</p>
            <div className="space-y-2">
              <TimeStepperRow
                label="시간"
                value={hour}
                minValue={0}
                maxValue={23}
                onChange={(next) => handleTimeChange(next, minute)}
              />
              <TimeStepperRow
                label="분"
                value={minute}
                minValue={0}
                maxValue={59}
                onChange={(next) => handleTimeChange(hour, next)}
              />
            </div>
            <div className="border-t border-border/60 pt-2 text-right">
              <span className="font-mono text-base font-bold text-foreground">
                {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

type TimeStepperRowProps = {
  label: string;
  value: number;
  minValue: number;
  maxValue: number;
  onChange: (next: number) => void;
};

/** 시간·분 스테퍼 행 — minus/plus 버튼이 값을 감싸는 최소 선택 UI. */
function TimeStepperRow({ label, value, minValue, maxValue, onChange }: TimeStepperRowProps) {
  const clamp = (next: number) => Math.min(maxValue, Math.max(minValue, next));

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-xs"
          aria-label={`${label} 감소`}
          disabled={value <= minValue}
          className="rounded-lg"
          onClick={() => onChange(clamp(value - 1))}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span aria-live="polite" className="min-w-8 text-center font-mono text-xs font-semibold">
          {String(value).padStart(2, '0')}
        </span>
        <Button
          variant="outline"
          size="icon-xs"
          aria-label={`${label} 증가`}
          disabled={value >= maxValue}
          className="rounded-lg"
          onClick={() => onChange(clamp(value + 1))}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
