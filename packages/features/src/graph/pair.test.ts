import { describe, expect, test } from 'bun:test';
import { graphPairKey, normalizeGraphPair } from './pair';

describe('graph pair normalization', () => {
  test('정방향과 역방향이 같은 canonical pair와 key를 만든다', () => {
    expect(normalizeGraphPair('b', 'a')).toEqual(['a', 'b']);
    expect(graphPairKey('a', 'b')).toBe(graphPairKey('b', 'a'));
  });
});
