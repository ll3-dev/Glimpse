import { describe, expect, it } from 'bun:test';
import { selectRecheckCandidates } from './recheck-candidates';

const item = (id: string, tags: string[]): Parameters<typeof selectRecheckCandidates>[2][number] =>
  ({ id, tags, updatedAt: 1, deletedAt: null }) as never;

describe('selectRecheckCandidates', () => {
  const incoming = item('new', ['rust', 'sync']);
  const pool = [
    item('p1', ['rust', 'misc']),
    item('p2', ['rust', 'sync', 'extra']),
    item('p3', ['unrelated']),
  ];

  it('태그 유사도 상위 K개만 반환', () => {
    const result = selectRecheckCandidates(incoming, pool, 2);
    expect(result.map((c) => c.id).sort()).toEqual(['p1', 'p2']);
  });

  it('후보 풀은 analyzed 아이템만 (stale은 별도 경로)', () => {
    // p3는 태그 겹침 0 → 어떤 경우에도 선택되지 않음
    const result = selectRecheckCandidates(incoming, pool, 10);
    expect(result).toHaveLength(2);
  });

  it('자기 자신 제외', () => {
    const result = selectRecheckCandidates(incoming, [incoming], 10);
    expect(result).toHaveLength(0);
  });

  it('빈 풀 → 빈 배열', () => {
    expect(selectRecheckCandidates(incoming, [], 5)).toEqual([]);
  });
});
