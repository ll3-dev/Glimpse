import { describe, expect, it } from 'bun:test';
import { createReviewReminderController } from './createReviewReminderController';
import type { ReviewReminderScheduler } from './types';

function fakeScheduler() {
  const calls: string[] = [];
  let scheduledBody: string | null = null;
  const scheduler: ReviewReminderScheduler = {
    requestPermission: async () => {
      calls.push('permission');
      return true;
    },
    scheduleDaily: async (_time, body) => {
      calls.push(`schedule:${body}`);
      scheduledBody = body;
    },
    cancel: async () => {
      calls.push('cancel');
      scheduledBody = null;
    },
    getStatus: async () => ({ scheduled: scheduledBody !== null }),
  };
  return { scheduler, calls, get scheduledBody() { return scheduledBody; } };
}

describe('createReviewReminderController', () => {
  it('활성화: 권한 요청 → 현재 due 개수로 하루 1회 예약', async () => {
    const fake = fakeScheduler();
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 7,
      locale: () => 'ko',
    });
    const result = await controller.enable({ hour: 21, minute: 0 });
    expect(result).toBe(true);
    expect(fake.calls[0]).toBe('permission');
    expect(fake.scheduledBody).toBe('복습할 항목 7개가 기다리고 있어요');
  });

  it('권한 거부 시 false 반환, 예약하지 않음', async () => {
    const fake = fakeScheduler();
    fake.scheduler.requestPermission = async () => false;
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 7,
    });
    expect(await controller.enable({ hour: 21, minute: 0 })).toBe(false);
    expect(fake.scheduledBody).toBeNull();
  });

  it('due 0개면 권한은 요청하지만 body 없이 예약하지 않는다', async () => {
    const fake = fakeScheduler();
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 0,
    });
    expect(await controller.enable({ hour: 21, minute: 0 })).toBe(true);
    expect(fake.scheduledBody).toBeNull();
    expect(fake.calls).toContain('permission');
    expect(fake.calls).toContain('cancel');
  });

  it('refresh: 기존 예약을 현재 due 개수로 갱신', async () => {
    const fake = fakeScheduler();
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 3,
    });
    await controller.refresh({ hour: 21, minute: 0 });
    await controller.refresh({ hour: 21, minute: 0 });
    expect(fake.calls.filter((c) => c.startsWith('schedule')).length).toBe(2);
  });

  it('disable: 취소 호출', async () => {
    const fake = fakeScheduler();
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 3,
    });
    await controller.disable();
    expect(fake.calls).toContain('cancel');
  });

  it('disable 후 refresh는 no-op', async () => {
    const fake = fakeScheduler();
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 3,
    });
    await controller.disable();
    await controller.refresh({ hour: 21, minute: 0 });
    expect(fake.calls.filter((c) => c.startsWith('schedule')).length).toBe(0);
  });
});
