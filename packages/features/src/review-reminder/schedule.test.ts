import { describe, expect, it } from 'bun:test';
import { computeNextFireAt, shouldReschedule } from './schedule';

const HOUR = 60 * 60 * 1000;

describe('computeNextFireAt', () => {
  it('returns today 21:00 when now is before the hour', () => {
    // 2026-08-28T10:00 local
    const now = new Date(2026, 7, 28, 10, 0, 0).getTime();
    const fire = computeNextFireAt(now, 21, 0);
    const d = new Date(fire);
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([28, 21, 0]);
    expect(fire).toBeGreaterThan(now);
  });

  it('returns tomorrow 21:00 when today slot has passed', () => {
    const now = new Date(2026, 7, 28, 22, 0, 0).getTime();
    const fire = computeNextFireAt(now, 21, 0);
    const d = new Date(fire);
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([29, 21, 0]);
  });

  it('advances exactly one day across month boundary', () => {
    // 2026-08-31T22:00 -> 2026-09-01T08:00
    const now = new Date(2026, 7, 31, 22, 0, 0).getTime();
    const fire = computeNextFireAt(now, 8, 0);
    const d = new Date(fire);
    expect([d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([8, 1, 8, 0]);
    expect(fire - now).toBe(10 * HOUR);
  });
});

describe('shouldReschedule', () => {
  it('is true when hour/minute changed', () => {
    expect(shouldReschedule({ hour: 21, minute: 0 }, { hour: 8, minute: 0 })).toBe(true);
  });
  it('is false when unchanged', () => {
    expect(shouldReschedule({ hour: 21, minute: 0 }, { hour: 21, minute: 0 })).toBe(false);
  });
});
