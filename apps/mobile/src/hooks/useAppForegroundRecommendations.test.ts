import { describe, expect, test } from 'bun:test';
import { buildMobileGraphSourceKey } from './useAppForegroundRecommendations';

describe('buildMobileGraphSourceKey', () => {
  test('순서에는 무관하고 저장·수정·삭제에는 달라진다', () => {
    const a = { id: 'a', updatedAt: 1 };
    const b = { id: 'b', updatedAt: 2 };
    expect(buildMobileGraphSourceKey([a, b])).toBe(buildMobileGraphSourceKey([b, a]));
    expect(buildMobileGraphSourceKey([a, b])).not.toBe(
      buildMobileGraphSourceKey([{ ...a, updatedAt: 3 }, b]),
    );
    expect(buildMobileGraphSourceKey([a, b])).not.toBe(buildMobileGraphSourceKey([a]));
  });
});
