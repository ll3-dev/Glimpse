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

  it('refresh: 시간·본문이 모두 같으면 재예약을 건너뛰고, 바뀌면 갱신한다', async () => {
    const fake = fakeScheduler();
    let count = 3;
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => count,
    });
    await controller.refresh({ hour: 21, minute: 0 });
    await controller.refresh({ hour: 21, minute: 0 });
    expect(fake.calls.filter((c) => c.startsWith('schedule')).length).toBe(1);
    count = 5;
    await controller.refresh({ hour: 21, minute: 0 });
    expect(fake.calls.filter((c) => c.startsWith('schedule')).length).toBe(2);
  });

  it('disable 중 대기 중이던 refresh는 예약을 부활시키지 않는다', async () => {
    const fake = fakeScheduler();
    let resolveDueCount!: (count: number) => void;
    const blocked = new Promise<number>((resolve) => {
      resolveDueCount = resolve;
    });
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: () => blocked,
    });
    const refreshPromise = controller.refresh({ hour: 21, minute: 0 });
    await controller.disable();
    resolveDueCount(3);
    await refreshPromise;
    expect(fake.calls).toEqual(['cancel']);
    expect(fake.scheduledBody).toBeNull();
  });

  it('scheduleDaily 실패 시 logger.error로 기록하고 전파하지 않는다', async () => {
    const errors: [string, unknown][] = [];
    const fake = fakeScheduler();
    fake.scheduler.scheduleDaily = async () => {
      throw new Error('boom');
    };
    const controller = createReviewReminderController({
      scheduler: fake.scheduler,
      getDueCount: async () => 3,
      logger: { error: (message, meta) => errors.push([message, meta]) },
    });
    await expect(controller.refresh({ hour: 21, minute: 0 })).resolves.toBeUndefined();
    expect(errors.length).toBe(1);
    expect(errors[0][1]).toBeInstanceOf(Error);
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
