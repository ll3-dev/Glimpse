/**
 * Chat message generation with optional knowledge-context injection.
 *
 * Routes through the AI provider system (managed-llm / local-server / rules / stub)
 * based on current desktop settings. Supports streaming token delivery
 * when an onToken callback is provided.
 *
 * `generateResponseWithKnowledge` retrieves the user's library via injected
 * deps, ranks with the pure `buildKnowledgeContext`, and PREPENDS the winning
 * system message to the history. Any step fails or finds nothing relevant →
 * the provider is called with the ORIGINAL history (silent fallback,
 * references []).
 *
 * 항목 벡터는 지속 임베딩 인덱스(embedding-index.ts)에서 재사용하고, 없거나
 * 텍스트가 바뀐 항목만 질문과 함께 한 배치로 임베딩한다. 모델이 바뀌면 캐시를
 * 폐기하고 전체를 다시 모은다.
 *
 * The router itself is injectable too (`ChatRouterDeps`) — bun의 mock.module은
 * 프로세스 전역이라 모듈 mock으로 라우터를 대체하면 같은 bun test 프로세스의
 * 뒤 테스트 파일(router.test.ts)까지 오염된다. 테스트는 deps 주입으로 격리하고
 * 운영 경로는 실 router를 그대로 쓴다.
 */

import type { KnowledgeItem } from '@glimpse/shared';
import { itemEmbeddingText } from '@glimpse/hooks';
import {
  buildKnowledgeContext,
  type KnowledgeContextEntry,
} from './knowledge-context';
import { embedForRag, createRagEmbedDeps } from './embed-knowledge-batch';
import {
  applyIndexWork,
  createLocalStorageEmbeddingIndexStore,
  planIndexWork,
  type EmbeddedItemText,
  type EmbeddingIndexStore,
  type IndexedItemText,
} from './embedding-index';
import { generateChatResponse, generateChatStreamResponse } from './router';
import type { StreamingCallbacks } from './types';
import { createRustraCoreClient } from '@/features/core/rustra-core-client';

/** 지식 항목 텍스트 → 벡터, 질문 벡터를 한 배치로 돌려주는 임베딩 계약. */
export interface ChatEmbedResult {
  queryVector: number[];
  itemVectors: Map<string, number[]>;
  /** 벡터를 만든 임베딩 모델 id — 캐시 무효화 판정에 쓴다. 없으면 캐시에 못 넣는다. */
  modelId?: string;
}

export interface ChatKnowledgeDeps {
  loadLibrary: () => Promise<KnowledgeItem[]>;
  embed: (question: string, itemTexts: string[]) => Promise<ChatEmbedResult | null>;
  /** 지속 임베딩 인덱스 저장소 — 생략하면 캐시 없이 매번 재임베딩한다(테스트 경로). */
  indexStore?: EmbeddingIndexStore;
}

export interface ChatResponseWithReferences {
  text: string;
  references: KnowledgeContextEntry[];
}

/**
 * 캐시 이후에도 남기는 안전 상한. 재임베딩 비용은 인덱스가 흡수했지만,
 * 비정상적으로 큰 라이브러리에서 메모리·랭킹 폭주를 막는 경계다. 초과분은
 * 최신 항목을 남기고 가장 오래된 것부터 잘라낸다.
 */
export const RAG_LIBRARY_SAFETY_LIMIT = 1000;

/**
 * 기본 지식 deps — 비(非)React 모듈이므로 `useOptionalCoreClient`는 못 쓰고,
 * main.tsx가 부팅 시 만드는 것과 동일한 `createRustraCoreClient()` 어댑터를
 * 지연 생성해 쓴다. 어댑터는 상태가 없고, 실제 전송은 `@rustra/types`가
 * globalThis 심볼 슬롯에 보관하는 전역 엔진에 위임되므로(`main.tsx`가
 * `configureRustraEngine`으로 부팅 시 배선) React 컨텍스트의 클라이언트와
 * 같은 러스트 백엔드에 도달한다. `useKnowledgeItemsQuery`도 결국 이 어댑터의
 * `listKnowledgeItems()`와 동일한 명령을 실행한다.
 */
export const defaultChatKnowledgeDeps: ChatKnowledgeDeps = {
  loadLibrary: (() => {
    let client: ReturnType<typeof createRustraCoreClient> | null = null;
    return async () => {
      client ??= createRustraCoreClient();
      return client.listKnowledgeItems();
    };
  })(),
  embed: (question, texts) => embedForRag(question, texts, createRagEmbedDeps()),
  indexStore: createLocalStorageEmbeddingIndexStore(),
};

/**
 * router 의존성 계약 — chat 응답/스트림 진입점만 노출한다. 테스트는 이 자리에
 * 모크를 주입해 mock.module('./router') 없이 격리한다(위 파일 헤더 주석 참조).
 */
export interface ChatRouterDeps {
  generateChatResponse: (
    messages: { role: string; content: string }[],
  ) => Promise<string>;
  generateChatStreamResponse: (
    messages: { role: string; content: string }[],
    callbacks: StreamingCallbacks,
  ) => Promise<string>;
}

/** 기본 router deps — 실제 라우터 모듈의 함수 그대로. */
export const defaultChatRouterDeps: ChatRouterDeps = {
  generateChatResponse,
  generateChatStreamResponse,
};

export async function generateResponseWithKnowledge(
  messages: { role: string; content: string }[],
  options?: { onToken?: (token: string) => void },
  knowledgeDeps: ChatKnowledgeDeps = defaultChatKnowledgeDeps,
  routerDeps: ChatRouterDeps = defaultChatRouterDeps,
): Promise<ChatResponseWithReferences> {
  const plain = async (): Promise<ChatResponseWithReferences> => ({
    text: await generateText(messages, options, routerDeps),
    references: [],
  });

  // 1) 마지막 사용자 메시지가 앵커. 없으면 지식 검색 근거가 없다.
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  if (!lastUser) return plain();

  // 2) 라이브러리 로딩 실패도 무음 폴백 — 채팅은 지식 검색이 깨져도 죽지 않는다.
  let library: KnowledgeItem[];
  try {
    library = await knowledgeDeps.loadLibrary();
  } catch (error) {
    console.warn('[chat-generation] knowledge library load failed; skipping RAG.', error);
    return plain();
  }
  if (library.length === 0) return plain();

  // 3) 최신성 우선 정렬 후 안전 상한 — 캐시가 재임베딩 비용을 흡수한 뒤에도
  //    남기는 메모리·랭킹 폭주 경계다(RAG_LIBRARY_SAFETY_LIMIT 주석 참조).
  //    상한을 넘으면 가장 오래된 항목부터 잘려나간다.
  const recencyFirst = [...library].sort(
    (left, right) => (right.updatedAt ?? right.createdAt ?? 0) - (left.updatedAt ?? left.createdAt ?? 0),
  );
  const cappedItems = recencyFirst.slice(0, RAG_LIBRARY_SAFETY_LIMIT);

  // 4) 항목 텍스트는 검색 리랭크와 같은 함수로 만들되, embedForRag의 결과가
  //    텍스트를 키로 하므로 고유 텍스트만 임베딩하고 벡터를 공유 항목 전체에
  //    되돌린다.
  const itemsByText = new Map<string, KnowledgeItem[]>();
  for (const item of cappedItems) {
    const text = itemEmbeddingText(item);
    const bucket = itemsByText.get(text);
    if (bucket) bucket.push(item);
    else itemsByText.set(text, [item]);
  }
  const uniqueTexts = [...itemsByText.keys()];
  const indexedItems: IndexedItemText[] = cappedItems.map((item) => ({
    id: item.id,
    text: itemEmbeddingText(item),
  }));

  // 5) 캐시 계획 — 저장 인덱스의 모델을 우선 신용하고 적중/재임베딩을 가른다.
  //    임베더가 다른 모델을 돌려주면(임베딩 GGUF 교체) 아래에서 전면 재집계한다.
  const store = knowledgeDeps.indexStore;
  const savedIndex = store?.load() ?? null;
  const plan = savedIndex
    ? planIndexWork(savedIndex, savedIndex.modelId, indexedItems)
    : { fresh: new Map<string, readonly number[]>(), stale: indexedItems };
  const staleTexts = [...new Set(plan.stale.map((item) => item.text))];
  const staleTextSet = new Set(staleTexts);

  // 6)~7) 임베딩 실패(모델 미로드·오류)면 원본 히스토리로 무음 폴백.
  const embeddedResult = await knowledgeDeps.embed(lastUser.content, staleTexts);
  if (!embeddedResult) return plain();

  let fresh = plan.fresh;
  let itemVectors = embeddedResult.itemVectors;
  let queryVector = embeddedResult.queryVector;
  let modelId = embeddedResult.modelId ?? savedIndex?.modelId;

  // 저장 인덱스와 실제 임베더의 모델이 다르면 의미 공간이 바뀐 것이다 —
  // 캐시를 폐기하고 전체 텍스트를 한 배치로 다시 모은다(드문 경로).
  if (savedIndex && modelId && savedIndex.modelId !== modelId) {
    const reembedded = await knowledgeDeps.embed(lastUser.content, uniqueTexts);
    if (!reembedded) return plain();
    fresh = new Map();
    itemVectors = reembedded.itemVectors;
    queryVector = reembedded.queryVector;
    modelId = reembedded.modelId ?? modelId;
  }

  const itemEmbeddings = new Map<string, readonly number[]>(fresh);
  const newlyEmbedded: EmbeddedItemText[] = [];
  for (const [text, vector] of itemVectors) {
    const shared = itemsByText.get(text);
    if (!shared) continue;
    for (const item of shared) {
      itemEmbeddings.set(item.id, vector);
      // 이번 배치에서 실제로 임베딩된 텍스트만 인덱스 반영 대상이다 —
      // 캐시 적중분은 이미 인덱스에 있다.
      if (staleTextSet.has(text)) newlyEmbedded.push({ id: item.id, text, vector });
    }
  }

  // 8) 캐시 저장 — 실패해도 채팅은 막지 않는다(다음 메시지가 재시도한다).
  if (store && modelId) {
    try {
      store.save(
        applyIndexWork(
          savedIndex,
          modelId,
          new Set(cappedItems.map((item) => item.id)),
          newlyEmbedded,
          Date.now(),
        ),
      );
    } catch {
      // localStorage 할당 초과 등 — 인메모리 랭킹은 이미 끝났다.
    }
  }

  // 9) 순수 랭킹 — 임계값 이상만 통과하고 system 메시지를 조립한다.
  const context = buildKnowledgeContext(cappedItems, {
    queryEmbedding: queryVector,
    itemEmbeddings,
  });
  if (context.entries.length === 0) return plain();

  const augmentedHistory = [...context.contextMessages, ...messages];
  const text = await generateText(augmentedHistory, options, routerDeps);
  return { text, references: context.entries };
}

/** 라우터 호출 — 스트리밍 여부만 갈린다. 라우터 빈 문자열엔 누적 텍스트 반환. */
async function generateText(
  history: { role: string; content: string }[],
  options?: { onToken?: (token: string) => void },
  routerDeps: ChatRouterDeps = defaultChatRouterDeps,
): Promise<string> {
  if (options?.onToken) {
    let fullText = '';
    return routerDeps.generateChatStreamResponse(history, {
      onToken: (token) => {
        fullText += token;
        options.onToken?.(token);
      },
      onDone: () => {
        // 스트리밍 완료 — fullText에 이미 누적됨
      },
      onError: () => {
        // 오류는 이미 상위에서 처리; 호출부는 throw를 받는다
      },
    }).then((text) => text || fullText);
  }
  return routerDeps.generateChatResponse(history);
}
