import { describe, expect, it } from 'bun:test';
import { shouldShowStubNoticeOnce, resetStubNoticeForTests } from './stub-notice';

describe('shouldShowStubNoticeOnce', () => {
  it('세션당 최초 1회만 true를 반환한다', () => {
    resetStubNoticeForTests();
    expect(shouldShowStubNoticeOnce()).toBe(true);
    expect(shouldShowStubNoticeOnce()).toBe(false);
    expect(shouldShowStubNoticeOnce()).toBe(false);
  });

  it('리셋하면 다시 1회 노출된다', () => {
    resetStubNoticeForTests();
    expect(shouldShowStubNoticeOnce()).toBe(true);
    resetStubNoticeForTests();
    expect(shouldShowStubNoticeOnce()).toBe(true);
    expect(shouldShowStubNoticeOnce()).toBe(false);
  });
});
