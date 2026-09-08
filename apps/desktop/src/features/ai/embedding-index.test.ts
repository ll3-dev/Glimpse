import { describe, expect, test } from 'bun:test';
import {
  applyIndexWork,
  createEmptyEmbeddingIndex,
  createLocalStorageEmbeddingIndexStore,
  createMemoryEmbeddingIndexStore,
  EMBEDDING_INDEX_MAX_ENTRIES,
  hashItemText,
  planIndexWork,
} from './embedding-index';

/**
 * 지속 임베딩 인덱스 순수 계약 테스트. 저장소(localStorage)는 bun 테스트
 * 환경에 없으므로 메모리 저장소로 계약을 검증하고, 실제 저장소는 실패가
 * 모두 "캐시 없음"으로 수렴하는지만 확인한다.
 */

describe('hashItemText', () => {
  test('같은 텍스트는 같은 해시, 다른 텍스트는 다른 해시다', () => {
    expect(hashItemText('소유권 개요')).toBe(hashItemText('소유권 개요'));
    expect(hashItemText('소유권 개요')).not.toBe(hashItemText('소유권 개요 v2'));
  });
});

describe('planIndexWork', () => {
  test('저장 인덱스가 없으면 전부 재임베딩 대상이다', () => {
    const plan = planIndexWork(null, 'emb-1', [{ id: 'a', text: '텍스트' }]);
    expect(plan.fresh.size).toBe(0);
    expect(plan.stale).toHaveLength(1);
  });

  test('모델이 다르면 해시가 같아도 전부 재임베딩 대상이다', () => {
    const index = createEmptyEmbeddingIndex('old-model');
    index.entries.a = { h: hashItemText('텍스트'), v: [1, 0], t: 1 };
    const plan = planIndexWork(index, 'new-model', [{ id: 'a', text: '텍스트' }]);
    expect(plan.fresh.size).toBe(0);
    expect(plan.stale).toHaveLength(1);
  });

  test('해시가 같은 항목은 적중, 바뀐 항목만 재임베딩 대상이다', () => {
    const index = createEmptyEmbeddingIndex('emb-1');
    index.entries.a = { h: hashItemText('텍스트 A'), v: [1, 0], t: 1 };
    index.entries.b = { h: hashItemText('텍스트 B (구)'), v: [0, 1], t: 1 };

    const plan = planIndexWork(index, 'emb-1', [
      { id: 'a', text: '텍스트 A' },
      { id: 'b', text: '텍스트 B (신)' },
    ]);
    expect(plan.fresh.get('a')).toEqual([1, 0]);
    expect(plan.stale).toEqual([{ id: 'b', text: '텍스트 B (신)' }]);
  });
});

describe('applyIndexWork', () => {
  test('라이브러리에 없는 항목은 프룬하고 새 벡터는 반올림해 반영한다', () => {
    const index = createEmptyEmbeddingIndex('emb-1');
    index.entries.gone = { h: 'x', v: [1, 0], t: 1 };
    index.entries.kept = { h: hashItemText('유지'), v: [0.5, 0.5], t: 1 };

    const next = applyIndexWork(
      index,
      'emb-1',
      new Set(['kept', 'new']),
      [{ id: 'new', text: '신규', vector: [0.123456789, 1] }],
      100,
    );

    expect(next.entries.gone).toBeUndefined();
    expect(next.entries.kept).toEqual({ h: hashItemText('유지'), v: [0.5, 0.5], t: 1 });
    expect(next.entries.new).toEqual({ h: hashItemText('신규'), v: [0.1235, 1], t: 100 });
  });

  test('모델이 다른 기존 인덱스는 이어받지 않는다', () => {
    const index = createEmptyEmbeddingIndex('old-model');
    index.entries.a = { h: 'x', v: [1, 0], t: 1 };

    const next = applyIndexWork(index, 'new-model', new Set(['a']), [], 1);
    expect(next.modelId).toBe('new-model');
    expect(next.entries.a).toBeUndefined();
  });

  test('상한 초과분은 기록 시각이 가장 오래된 것부터 방출한다', () => {
    let index = createEmptyEmbeddingIndex('emb-1');
    const libraryIds = new Set<string>();
    for (let order = 0; order <= EMBEDDING_INDEX_MAX_ENTRIES; order += 1) {
      libraryIds.add(`item-${order}`);
      index = applyIndexWork(
        index,
        'emb-1',
        libraryIds,
        [{ id: `item-${order}`, text: `텍스트 ${order}`, vector: [1, 0] }],
        order,
      );
    }
    expect(Object.keys(index.entries)).toHaveLength(EMBEDDING_INDEX_MAX_ENTRIES);
    expect(index.entries['item-0']).toBeUndefined();
    expect(index.entries[`item-${EMBEDDING_INDEX_MAX_ENTRIES}`]).toBeDefined();
  });
});

describe('메모리 저장소', () => {
  test('저장 실패는 예외로 드러나고 호출부가 무음 처리한다', () => {
    const store = createMemoryEmbeddingIndexStore(null);
    store.failNextSave();
    expect(() =>
      store.save(createEmptyEmbeddingIndex('emb-1')),
    ).toThrow('quota exceeded');
  });
});

describe('localStorage 저장소', () => {
  test('저장소가 없는 환경에서도 예외 없이 캐시 없음으로 수렴한다', () => {
    const store = createLocalStorageEmbeddingIndexStore();
    expect(store.load()).toBeNull();
    expect(() => store.save(createEmptyEmbeddingIndex('emb-1'))).not.toThrow();
  });
});
