export interface ReminderTime {
  hour: number; // 0-23
  minute: number; // 0-59
}

export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 21, minute: 0 };

/** 다음 발화 시각: 오늘 hour:minute이 지났으면 내일 같은 시각. */
export function computeNextFireAt(now: number, hour: number, minute: number): number {
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate.getTime() <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.getTime();
}

export function shouldReschedule(current: ReminderTime, next: ReminderTime): boolean {
  return current.hour !== next.hour || current.minute !== next.minute;
}
