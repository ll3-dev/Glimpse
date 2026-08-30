import { describe, expect, test, beforeAll } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// bun test에는 DOM이 없어 testing-library 렌더에 필요한 document/window를
// happy-dom으로 등록한다. useSemanticRerank.test.ts와 동일하게, 등록이
// globalThis.localStorage를 getter-only로 바꿔 다른 테스트 파일의 직접
// 할당을 깨지 않도록 이미 존재하면 보존하고 없을 때만 정의한다.
// 두 테스트 파일이 한 프로세스에서 함께 실행될 수 있어 등록은 최초 1회만.
beforeAll(() => {
  const existing = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  if (!GlobalRegistrator.isRegistered) {
    GlobalRegistrator.register({ url: 'http://localhost/' });
  }
  if (existing && !Object.getOwnPropertyDescriptor(globalThis, 'localStorage')?.writable) {
    Object.defineProperty(globalThis, 'localStorage', {
      ...existing,
      configurable: true,
    });
  }
});

import {
  useMarkAsReviewedMutation,
  useMarkAsForgottenMutation,
  usePostponeReviewMutation,
} from './useReviewMutations';
import { CoreClientContext } from '../core-client-context';
import { queryKeys } from '../query-keys';
import type { CoreClient, KnowledgeItem } from '@glimpse/shared';

/**
 * 복습 뮤테이션 계약:
 * - 리스트(['knowledgeItems']) 패치에 더해, 상세 화면이 구독하는
 *   ['knowledgeItems','detail',id] 쿼리를 무효화해야 한다.
 *   (setQueryData는 exact 키만 건드리므로 상세는 명시 무효화가 필요)
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
    stability: 0.5,
    difficulty: 5,
    lastReviewedAt: null,
    nextReviewAt: null,
    ...overrides,
  } as KnowledgeItem;
}

function makeCoreClient() {
  const updated: Array<{ itemId: string; patch: Record<string, unknown> }> = [];
  const coreClient = {
    updateKnowledgeItem: async (itemId: string, patch: Record<string, unknown>) => {
      updated.push({ itemId, patch });
      return makeItem({ id: itemId });
    },
  } as unknown as CoreClient;
  return { coreClient, updated };
}

function createWrapper(qc: QueryClient, coreClient: CoreClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: qc },
      createElement(CoreClientContext.Provider, { value: coreClient }, children),
    );
  };
}

/** onSuccess의 invalidateQueries 알림이 notifyManager 배치(setTimeout)로
 * 늦게 도는 것을 act 안에서 흡수해 경고 없이 상태를 안정화한다. */
async function flushNotifications() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('useReviewMutations — knowledgeItems detail 쿼리 무효화', () => {
  test('markAsReviewed 성공 시 detail 쿼리를 무효화한다', async () => {
    const qc = new QueryClient();
    const item = makeItem({ id: 'reviewed-1' });
    const detailKey = queryKeys.knowledgeItems.detail(item.id);
    qc.setQueryData(detailKey, makeItem({ id: 'reviewed-1' }));

    const { coreClient } = makeCoreClient();
    const { result } = renderHook(() => useMarkAsReviewedMutation(), {
      wrapper: createWrapper(qc, coreClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ item });
    });
    await flushNotifications();

    expect(qc.getQueryState(detailKey)?.isInvalidated).toBe(true);
  });

  test('markAsForgotten 성공 시 detail 쿼리를 무효화한다', async () => {
    const qc = new QueryClient();
    const item = makeItem({ id: 'forgotten-1' });
    const detailKey = queryKeys.knowledgeItems.detail(item.id);
    qc.setQueryData(detailKey, makeItem({ id: 'forgotten-1' }));

    const { coreClient } = makeCoreClient();
    const { result } = renderHook(() => useMarkAsForgottenMutation(), {
      wrapper: createWrapper(qc, coreClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ item });
    });
    await flushNotifications();

    expect(qc.getQueryState(detailKey)?.isInvalidated).toBe(true);
  });

  test('postponeReview 성공 시 detail 쿼리를 무효화한다', async () => {
    const qc = new QueryClient();
    const item = makeItem({ id: 'postponed-1' });
    const detailKey = queryKeys.knowledgeItems.detail(item.id);
    qc.setQueryData(detailKey, makeItem({ id: 'postponed-1' }));

    const { coreClient } = makeCoreClient();
    const { result } = renderHook(() => usePostponeReviewMutation(), {
      wrapper: createWrapper(qc, coreClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ item });
    });
    await flushNotifications();

    expect(qc.getQueryState(detailKey)?.isInvalidated).toBe(true);
  });
});
