import { describe, expect, it } from 'bun:test';
import { buildReminderMessage } from './message';

describe('buildReminderMessage', () => {
  it('ko: 1개일 때도 자연스럽다', () => {
    expect(buildReminderMessage('ko', 1)).toBe('복습할 항목 1개가 기다리고 있어요');
  });
  it('ko: N개', () => {
    expect(buildReminderMessage('ko', 12)).toBe('복습할 항목 12개가 기다리고 있어요');
  });
  it('en', () => {
    expect(buildReminderMessage('en', 3)).toBe('3 items are waiting for review');
  });
  it('en: 단수형', () => {
    expect(buildReminderMessage('en', 1)).toBe('1 item is waiting for review');
  });
  it('0개는 알림을 보내지 않는다 (null)', () => {
    expect(buildReminderMessage('ko', 0)).toBeNull();
  });
});
