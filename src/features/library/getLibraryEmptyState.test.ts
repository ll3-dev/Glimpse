import { describe, expect, test } from 'bun:test';
import { getLibraryEmptyState } from './getLibraryEmptyState';

describe('getLibraryEmptyState', () => {
  test('returns no-items state when there are no saved items', () => {
    const state = getLibraryEmptyState('', 0, 0);
    expect(state.title).toBe('아직 저장된 지식이 없습니다');
    expect(state.description).toBe('수집 탭에서 메모나 링크를 저장해 보세요.');
  });

  test('returns no-items state even with search query when total items are zero', () => {
    const state = getLibraryEmptyState('react', 0, 0);
    expect(state.title).toBe('아직 저장된 지식이 없습니다');
  });

  test('returns no-search-results state when query exists and filtered list is empty', () => {
    const state = getLibraryEmptyState('react', 3, 0);
    expect(state.title).toBe('검색 결과가 없습니다');
    expect(state.description).toBe('다른 키워드로 다시 검색해 보세요.');
  });

  test('treats whitespace-only query as empty query', () => {
    const state = getLibraryEmptyState('   ', 3, 0);
    expect(state.title).toBe('아직 저장된 지식이 없습니다');
  });
});

