import { describe, expect, it } from 'bun:test';
import { sanitizeReminderTime } from './review-reminder.store';

describe('sanitizeReminderTime', () => {
  it('범위 내 값은 그대로 둔다', () => {
    expect(sanitizeReminderTime(21, 30)).toEqual({ hour: 21, minute: 30 });
    expect(sanitizeReminderTime(0, 0)).toEqual({ hour: 0, minute: 0 });
    expect(sanitizeReminderTime(23, 59)).toEqual({ hour: 23, minute: 59 });
  });

  it('범위를 벗어나면 경계로 고정한다', () => {
    expect(sanitizeReminderTime(24, 60)).toEqual({ hour: 23, minute: 59 });
    expect(sanitizeReminderTime(-1, -5)).toEqual({ hour: 0, minute: 0 });
  });

  it('숫자가 아니면 기본값(21:00)으로 복원한다', () => {
    expect(sanitizeReminderTime(undefined, undefined)).toEqual({ hour: 21, minute: 0 });
    expect(sanitizeReminderTime(Number.NaN, 'x' as unknown as number)).toEqual({
      hour: 21,
      minute: 0,
    });
  });

  it('소수는 내림한다', () => {
    expect(sanitizeReminderTime(7.9, 5.5)).toEqual({ hour: 7, minute: 5 });
  });
});
