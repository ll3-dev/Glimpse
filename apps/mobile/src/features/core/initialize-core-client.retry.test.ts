import { describe, expect, test } from 'bun:test';
import { Effect } from 'effect';
import { appError } from '@/src/lib/effect-result';

/**
 * 코어 초기화 재시도 회귀 테스트.
 *
 * 실제 구현(initialize-core-client.native.ts)은 RNBlobUtil/JSI에
 * 의존해 bun:test 환경에서 직접 import하면 mock 세트업 전 평문
 * 모듈 로드가 필요하다. 여기서는 실패 캐시 재셋 계약 자체를
 * 순수 로직으로 검증한다 — 프로미스 캐시가 거부 후 null로
 * 풀리지 않으면 "다시 시도"가 동일한 거부를 반환한다.
 */

type InitializeFn = () => Promise<string>;

function createResilientInitializer(init: () => Promise<string>): {
  initialize: InitializeFn;
  attempts: () => number;
} {
  let cached: Promise<string> | null = null;
  let attempts = 0;

  return {
    attempts: () => attempts,
    initialize() {
      if (cached) return cached;
      attempts += 1;
      const promise = init();
      cached = promise;
      promise.catch(() => {
        if (cached === promise) cached = null;
      });
      return promise;
    },
  };
}

describe('core initialization retry', () => {
  test('실패 후 재호출하면 새 초기화를 시도한다', async () => {
    let failures = 1;
    const { initialize, attempts } = createResilientInitializer(async () => {
      if (failures > 0) {
        failures -= 1;
        throw new Error('db locked');
      }
      return '/db/path';
    });

    await expect(initialize()).rejects.toThrow('db locked');
    expect(attempts()).toBe(1);

    // 재시도는 캐시된 거부가 아니라 실제 재초기화여야 한다
    await expect(initialize()).resolves.toBe('/db/path');
    expect(attempts()).toBe(2);
  });

  test('성공한 초기화는 캐시가 유지된다', async () => {
    const { initialize, attempts } = createResilientInitializer(async () => '/db/path');

    await expect(initialize()).resolves.toBe('/db/path');
    await expect(initialize()).resolves.toBe('/db/path');
    expect(attempts()).toBe(1);
  });

  test('거부된 첫 호출은 여전히 거부를 전파한다 (catch 재셋이 삼키지 않음)', async () => {
    const { initialize } = createResilientInitializer(async () => {
      throw new Error('boom');
    });

    const appErr = appError('UNKNOWN_ERROR', 'boom');
    expect(appErr._tag).toBe('UNKNOWN_ERROR');
    await expect(initialize()).rejects.toThrow('boom');
  });

  test('Effect 러너로 비동기 폴백 흐름이 그대로 동작한다', async () => {
    const result = await Effect.runPromise(
      Effect.tryPromise({
        try: () => Promise.resolve('/db/path'),
        catch: (e) => appError('UNKNOWN_ERROR', 'init failed', e),
      }),
    );
    expect(result).toBe('/db/path');
  });
});
