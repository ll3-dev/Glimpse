import { describe, expect, test } from 'bun:test';
import {
  acquireLocalLLMKeepAlive,
  hasLocalLLMKeepAlive,
  releaseLocalLLMKeepAlive,
} from './background-keepalive';

describe('background-keepalive', () => {
  test('acquire 후에는 keep-alive가 활성화된다', () => {
    expect(hasLocalLLMKeepAlive()).toBe(false);

    acquireLocalLLMKeepAlive();
    try {
      expect(hasLocalLLMKeepAlive()).toBe(true);
    } finally {
      releaseLocalLLMKeepAlive();
    }

    expect(hasLocalLLMKeepAlive()).toBe(false);
  });

  test('release가 0 아래로 내려가면 0으로 클램프된다', () => {
    // 카운터가 모듈 레벨이므로 방어적으로 정리 후 시작
    while (hasLocalLLMKeepAlive()) {
      releaseLocalLLMKeepAlive();
    }

    expect(() => releaseLocalLLMKeepAlive()).not.toThrow();
    expect(hasLocalLLMKeepAlive()).toBe(false);

    acquireLocalLLMKeepAlive();
    releaseLocalLLMKeepAlive();
    releaseLocalLLMKeepAlive();
    expect(hasLocalLLMKeepAlive()).toBe(false);
  });

  test('여러 번 acquire하면 마지막 release까지 활성 상태를 유지한다', () => {
    acquireLocalLLMKeepAlive();
    acquireLocalLLMKeepAlive();
    try {
      releaseLocalLLMKeepAlive();
      expect(hasLocalLLMKeepAlive()).toBe(true);
    } finally {
      releaseLocalLLMKeepAlive();
    }

    expect(hasLocalLLMKeepAlive()).toBe(false);
  });
});
