/**
 * Chat message generation with optional knowledge-context injection.
 *
 * Routes through the AI provider system (local-llm / BYOK / rules / stub)
 * based on current desktop settings. Supports streaming token delivery
 * when an onToken callback is provided.
 *
 * `generateResponseWithKnowledge` retrieves the user's library via injected
 * deps, embeds the last user message + item texts in one batch, ranks with
 * the pure `buildKnowledgeContext`, and PREPENDS the winning system message
 * to the history. Any step fails or finds nothing relevant → the provider is
 * called with the ORIGINAL history (silent fallback, references []).
 */

import type { KnowledgeItem } from '@glimpse/shared';
import { itemEmbeddingText } from '@glimpse/hooks';
import {
  buildKnowledgeContext,
  type KnowledgeContextEntry,
} from './knowledge-context';
import { embedForRag, createRagEmbedDeps } from './embed-knowledge-batch';
import { generateChatResponse, generateChatStreamResponse } from './router';
import { createRustraCoreClient } from '@/features/core/rustra-core-client';

/** 지식 항목 텍스트 → 벡터, 질문 벡터를 한 배치로 돌려주는 임베딩 계약. */
export interface ChatKnowledgeDeps {
  loadLibrary: () => Promise<KnowledgeItem[]>;
  embed: (
    question: string,
    itemTexts: string[],
  ) => Promise<{
    queryVector: number[];
    itemVectors: Map<string, number[]>;
  } | null>;
}

export interface ChatResponseWithReferences {
  text: string;
  references: KnowledgeContextEntry[];
}

/**
 * 데스크톱 chat RAG 재임베딩 비용 상한. 임베딩 캐시가 없는 이 호출부는 채팅
 * 메시지마다 라이브러리를 재임베딩하므로, 상한 없이는 긴 라이브러리에서 메시지
 * 지연이 라이브러리 크기에 비례해 자란다 — 100개로 자른다(재검토 지적 반영).
 */
export const RAG_LIBRARY_LIMIT = 100;

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
};

export async function generateResponseWithKnowledge(
  messages: { role: string; content: string }[],
  options?: { onToken?: (token: string) => void },
  knowledgeDeps: ChatKnowledgeDeps = defaultChatKnowledgeDeps,
): Promise<ChatResponseWithReferences> {
  const plain = async (): Promise<ChatResponseWithReferences> => ({
    text: await generateText(messages, options),
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

  // 3) 상한 컷 — 캐시 없는 재임베딩 비용이 메시지당 라이브러리 크기에 비례해
  //    자라는 것을 막는 경계(위 RAG_LIBRARY_LIMIT 주석 참조).
  //    주의: slice 순서는 테이블 순서 그대로라 최신성·관련성 편향이 없다 —
  //    라이브러리가 자라면 관련 항목이 조용히 잘려나갈 수 있다(참조 []).
  //    TODO: 임베딩 캐시 + 최신성 우선 정렬이 후속 작업.
  const cappedItems = library.slice(0, RAG_LIBRARY_LIMIT);

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

  // 5)~6) 임베딩 실패(모델 미로드·오류)면 원본 히스토리로 무음 폴백.
  const embedded = await knowledgeDeps.embed(lastUser.content, uniqueTexts);
  if (!embedded) return plain();

  const itemEmbeddings = new Map<string, readonly number[]>();
  for (const [text, vector] of embedded.itemVectors) {
    const shared = itemsByText.get(text);
    if (!shared) continue;
    for (const item of shared) itemEmbeddings.set(item.id, vector);
  }

  // 7) 순수 랭킹 — 임계값 이상만 통과하고 system 메시지를 조립한다.
  const context = buildKnowledgeContext(cappedItems, {
    queryEmbedding: embedded.queryVector,
    itemEmbeddings,
  });
  if (context.entries.length === 0) return plain();

  const augmentedHistory = [...context.contextMessages, ...messages];
  const text = await generateText(augmentedHistory, options);
  return { text, references: context.entries };
}

/** 라우터 호출 — 스트리밍 여부만 갈린다. 라우터 빈 문자열엔 누적 텍스트 반환. */
async function generateText(
  history: { role: string; content: string }[],
  options?: { onToken?: (token: string) => void },
): Promise<string> {
  if (options?.onToken) {
    let fullText = '';
    return generateChatStreamResponse(history, {
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
  return generateChatResponse(history);
}
