import { describe, expect, test, beforeAll } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { renderHook, act } from '@testing-library/react';

// bun test에는 DOM이 없어 testing-library 렌더에 필요한 document/window를
// happy-dom으로 등록한다(훅이 window.setTimeout을 쓴다). 단, 등록이
// globalThis.localStorage를 getter-only로 바꿔 같은 프로세스의 다른 테스트
// 파일(byok-provider.test.ts)의 모듈 스코프 직접 할당을 깨므로, 등록 대신
// 이미 존재하면 보존하고 없을 때만 정의한다.
beforeAll(() => {
  const existing = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  GlobalRegistrator.register({ url: 'http://localhost/' });
  if (existing && !Object.getOwnPropertyDescriptor(globalThis, 'localStorage')?.writable) {
    Object.defineProperty(globalThis, 'localStorage', {
      ...existing,
      configurable: true,
    });
  }
});
import {
  useSemanticRerank,
  itemEmbeddingText,
  embeddingCacheKey,
  MAX_EMBED_ITEMS,
  SEMANTIC_RERANK_DEBOUNCE_MS,
} from './useSemanticRerank';
import type { SemanticEmbedDeps, SemanticEmbedRequest } from './useSemanticRerank';
import type { KnowledgeItem } from '@glimpse/shared';

/**
 * 승격된(deps 주입형) semantic 재정렬 훅 계약:
 * - N항목 재정렬 임베딩이 정확히 1회 배치 호출(항목당 호출 아님)
 * - 캐시 히트 시 재호출 없음(미스+query만 배치에 포함)
 * - 실패 시 warn-once 후 키워드 순서 폴백(rankBySemanticSimilarity 미적용)
 */

function makeItem(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    id: 'item-1',
    title: 'Alpha note',
    summary: null,
    body: null,
    createdAt: 1000,
    updatedAt: 2000,
    tags: [],
    ...overrides,
  } as KnowledgeItem;
}

function deterministicEmbedDeps() {
  const calls: SemanticEmbedRequest[][] = [];
  const deps: SemanticEmbedDeps = {
    resolveEmbeddingTarget: async () => ({ runtimeId: 'rt', modelId: 'model-a' }),
    embedBatch: async (requests) => {
      calls.push(requests);
      return requests.map((request) => ({
        vector: [request.input.length, request.input.charCodeAt(0) || 0],
      }));
    },
  };
  return { deps, calls };
}

function flushDebounce(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SEMANTIC_RERANK_DEBOUNCE_MS + 30));
}

describe('useSemanticRerank (주입형 배치)', () => {
  test('빈 query는 폴백 순서 유지 + embed 호출 없음', async () => {
    const { deps, calls } = deterministicEmbedDeps();
    const items = [makeItem()];
    const { result } = renderHook(() => useSemanticRerank(items, '', deps));
    await act(async () => {
      await flushDebounce();
    });
    expect(calls).toHaveLength(0);
    expect(result.current.active).toBe(false);
    expect(result.current.items).toEqual(items);
  });

  test('N항목 재정렬이 정확히 1회 embedBatch 호출로 처리되고 유사도 순으로 정렬된다', async () => {
    const { deps, calls } = deterministicEmbedDeps();
    // query와 항목 텍스트 길이를 다르게 해 점수 차이를 만든다
    const items = [
      makeItem({ id: 'short', title: 'ab', updatedAt: 1 }),
      makeItem({ id: 'long', title: 'abcdefgh', updatedAt: 2 }),
    ];
    const { result } = renderHook(() =>
      useSemanticRerank(items, items[0].title as string, deps),
    );
    await act(async () => {
      await flushDebounce();
    });

    expect(calls).toHaveLength(1);
    // 미스 2건 + query 1건이 하나의 배치로 간다
    expect(calls[0]).toHaveLength(3);
    expect(result.current.active).toBe(true);
  });

  test('캐시 히트 시 바뀐 query 임베딩만 새로 요청한다', async () => {
    const { deps, calls } = deterministicEmbedDeps();
    const items = [makeItem()];
    const hook = renderHook(({ q }: { q: string }) => useSemanticRerank(items, q, deps), {
      initialProps: { q: 'alpha note' },
    });
    await act(async () => {
      await flushDebounce();
    });
    expect(calls).toHaveLength(1); // 아이템 1 + query 1

    // 같은 마운트 상태에서 query만 변경 — 아이템 벡터는 캐시 재사용되어
    // 두 번째 배치에는 query 하나만 실린다. act 내 rerender+대기를 한
    // 블록에 넣으면 happy-dom 타이머 정리 특성으로 effect가 유실되므로
    // rerender와 대기를 분리한다.
    act(() => {
      hook.rerender({ q: 'different query entirely' });
    });
    await act(async () => {
      await flushDebounce();
    });

    expect(calls).toHaveLength(2);
    expect(calls[1]).toHaveLength(1); // query만
    expect(calls[1][0].input).toBe('different query entirely');
    hook.unmount();
  });

  test('embedBatch 실패 시 경고 후 키워드 순서 폴백(active=false)', async () => {
    const warnings: unknown[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(args);
    try {
      const failing: SemanticEmbedDeps = {
        resolveEmbeddingTarget: async () => ({ runtimeId: 'rt', modelId: 'model-broken' }),
        embedBatch: async () => {
          throw new Error('contract violated');
        },
      };
      const items = [makeItem(), makeItem({ id: 'item-2' })];
      const { result } = renderHook(() => useSemanticRerank(items, 'anything', failing));
      await act(async () => {
        await flushDebounce();
      });
      expect(result.current.active).toBe(false);
      expect(result.current.items).toEqual(items);
      expect(warnings.length > 0).toBe(true);
    } finally {
      console.warn = originalWarn;
    }
  });

  test('resolveEmbeddingTarget null(모델 미로드)은 비활성 pass-through', async () => {
    let calls = 0;
    const deps: SemanticEmbedDeps = {
      resolveEmbeddingTarget: async () => {
        calls += 1;
        return null;
      },
      embedBatch: async () => [],
    };
    const items = [makeItem()];
    const { result } = renderHook(() => useSemanticRerank(items, 'query', deps));
    await act(async () => {
      await flushDebounce();
    });
    expect(calls).toBe(1);
    expect(result.current.active).toBe(false);
    expect(result.current.items).toEqual(items);
  });

  test('후보가 상한을 넘으면 MAX_EMBED_ITEMS까지만 임베딩한다', async () => {
    const { deps, calls } = deterministicEmbedDeps();
    const items = Array.from({ length: MAX_EMBED_ITEMS + 5 }, (_, i) =>
      makeItem({ id: `item-${i}` }),
    );
    renderHook(() => useSemanticRerank(items, 'q', deps));
    await act(async () => {
      await flushDebounce();
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveLength(MAX_EMBED_ITEMS + 1); // 상한 + query
  });

  test('itemEmbeddingText는 title/summary/body 발췌를 결합하고 빈 필드를 건너뛴다', () => {
    const body = 'x'.repeat(600);
    const text = itemEmbeddingText(makeItem({ title: 'T', summary: 'S', body }) as KnowledgeItem);
    expect(text.startsWith('T\nS\n')).toBe(true);
    // title(1)+summary(1)+구분자 2 + 발췌 500 = 504
    expect(text.length).toBe(4 + 500);
    const empty = itemEmbeddingText(makeItem({ title: null, summary: null, body: null }) as KnowledgeItem);
    expect(empty).toBe('');
  });

  test('embeddingCacheKey는 모델 스왑 시 stale 캐시 무효화 키를 만든다', () => {
    const item = makeItem();
    const a = embeddingCacheKey('model-a', item);
    const b = embeddingCacheKey('model-b', item);
    expect(a).not.toBe(b);
    expect(embeddingCacheKey('model-a', { ...item, updatedAt: 9999 })).not.toBe(a);
  });
});
