import { beforeEach, describe, expect, test } from 'bun:test';
import { generateDailyNarrative, getCachedDailyNarrative, setCachedDailyNarrative } from './daily-narrative.service';
import type { TodaySummary } from '@glimpse/features';
import { toLocalDayKey } from '@glimpse/features';
import type { Result } from '@/src/lib/effect-result';
import type { AITarget } from '@/src/features/ai/targets';
import { storage } from '@/src/lib/storage';

/**
 * 오늘 요약 내러티브 서비스 — 라우팅/캐시 계약 검증.
 * 실행 타깃은 DI로 대체해 provider·네트워크 없이 검증한다.
 */

function makeSummary(overrides?: Partial<TodaySummary>): TodaySummary {
  return {
    captureCount: 2,
    captures: [
      { id: 'a', title: 'Rust 소유권 노트', preview: '소유권 메모', type: 'note', createdAt: 1 },
      { id: 'b', title: 'Qwen 로컬 실행 팁', preview: '팁 메모', type: 'note', createdAt: 2 },
    ],
    newConnectionCount: 1,
    ...overrides,
  };
}

const appleTarget: AITarget = { kind: 'apple', model: 'foundation-model', id: 'apple.foundation-model' };
const stubTarget: AITarget = { kind: 'stub', id: 'stub.default' };

describe('generateDailyNarrative', () => {
  beforeEach(() => {
    // 캐시 정리 — 일자 키 슬롯 초기화
    const today = toLocalDayKey(new Date());
    storage.remove(`daily_narrative:${today}`);
  });

  test('지원 타깃이면 생성하고 캐시에 남긴다', async () => {
    const narrative = await generateDailyNarrative(makeSummary(), {
      resolveTarget: () => appleTarget,
      execute: async (_target, prompt): Promise<Result<string>> => {
        // 프롬프트에 실제 항목명이 인용되어 있다
        expect(prompt).toContain('Rust 소유권 노트');
        return { success: true, data: '**오늘** Rust 소유권 노트와 Qwen 로컬 실행 팁을 남겼다.' };
      },
    });

    expect(narrative).toBe('오늘 Rust 소유권 노트와 Qwen 로컬 실행 팁을 남겼다.');
    expect(getCachedDailyNarrative()).toBe(narrative);
  });

  test('캡처 0건이면 생성을 생략한다(null)', async () => {
    let executed = false;
    const narrative = await generateDailyNarrative(
      makeSummary({ captureCount: 0, captures: [], newConnectionCount: 0 }),
      {
        resolveTarget: () => appleTarget,
        execute: async (): Promise<Result<string>> => {
          executed = true;
          return { success: true, data: 'x' };
        },
      },
    );

    expect(narrative).toBeNull();
    expect(executed).toBe(false);
  });

  test('stub 타깃으로 폴백되면 문단을 숨긴다(null)', async () => {
    let executed = false;
    const narrative = await generateDailyNarrative(makeSummary(), {
      resolveTarget: () => stubTarget,
      execute: async (): Promise<Result<string>> => {
        executed = true;
        return { success: true, data: 'x' };
      },
    });

    expect(narrative).toBeNull();
    expect(executed).toBe(false);
  });

  test('실행 실패는 조용히 숨긴다(null)', async () => {
    const narrative = await generateDailyNarrative(makeSummary(), {
      resolveTarget: () => appleTarget,
      execute: async (): Promise<Result<string>> => ({
        success: false,
        error: { code: 'GENERATION_ERROR', message: 'boom' },
      }),
    });

    expect(narrative).toBeNull();
    expect(getCachedDailyNarrative()).toBeNull();
  });
});

describe('일자 키 캐시', () => {
  test('다른 날 키의 캐시는 읽히지 않는다', () => {
    setCachedDailyNarrative('어제의 회고', '2000-01-01');
    expect(getCachedDailyNarrative('2000-01-01')).toBe('어제의 회고');
    expect(getCachedDailyNarrative()).toBeNull();
  });
});
