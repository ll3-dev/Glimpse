# 활용 루프 구현 플랜 — 채팅 RAG · 그래프→행동 · Shortcuts 캡처

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 저장된 지식이 쓰이는 루프를 완성한다 — 채팅에서 관련 지식 자동 참조(RAG), 복습 우선순위에 연결도 반영, digest에서 최근 연결 발견 표시, iOS Shortcuts 즉시 캡처.

**Architecture:** 데스크톱 채팅 호출부 앞단(`ChatView.handleSend` → `chat-generation.ts`)에 임베딩 검색+프롬프트 조립을 붙이고(`router.ts`·프로바이더 무변경), due 아이템 정렬을 `packages/features/src/review`의 순수 함수로 보강하며, digest 화면에 최근 엣지 섹션을 얹는다. iOS는 App Intent가 App Group UserDefaults 기존 수용 레코드 형식(`ll3.krShareKey`)에 써서 기존 흡수 파이프라인(`useProcessPendingShares`)으로 흡수한다.

**Tech Stack:** TypeScript (bun test), React Query, TanStack Router, Swift (App Intents, iOS 16.4), App Group UserDefaults.

**제약 (다른 세션 병행 작업 중):**
- 커밋은 항상 `git add <내 파일>`로 명시적 지정 — `git add -A`, `commit -a` 금지.
- 트랙 A/B 세션이 `apps/desktop/src/features/graph/*`(incremental-graph, recheck-candidates, analysis-state)와 브리지 파일을 건드리는 중. 본 플랜은 `generate-knowledge-graph.ts`를 **수정하지 않는다** (C2-b는 엣지를 읽기만 함).
- 각 게이트에서 실패가 남의 파일에서 나면 그 테스트만 골라 재판정하고 진행 중단 없이 보고.

**설계 문서:** `docs/plans/2026-08-30-apply-loop-design.md`

---

## 참조: 접점 코드 사실 (조사 완료)

- 채팅 생성: `apps/desktop/src/features/ai/chat-generation.ts`의 `generateResponse` 호출자는 **`ChatView.tsx:112` 단 한 곳**. `router.ts`의 양쪽 경로(`generateChatResponse` :92-138, `generateChatStreamResponse` :149-196)는 `role:'system'` 메시지를 시스템 프롬프트로 보존하므로 **컨텍스트를 system 메시지로 주입하면 프로바이더 무변경**.
- 순수 순위 함수: `packages/features/src/search/semantic.ts` — `cosineSimilarity`(:13), `rankBySemanticSimilarity`(:46). `@glimpse/features`로 export됨. 임계값 상수는 없음(본 플랜에서 정의).
- 임베딩 전송: `apps/desktop/src/features/search/useSemanticRerank.ts:18-38`의 `createDesktopEmbedDeps`(`resolveEmbeddingTarget` — 임베딩 모델 미로드 시 `null`, `embedBatch` → `service.runEmbeddingBatch`). 실패는 throw — 호출부에서 폴백 책임.
- `KnowledgeItem` 필드: `id`, `title|null`, `summary|null`, `body|null`, `tags: string[]|null`, `createdAt`, `updatedAt` (`packages/shared/src/index.ts:36-59`).
- `Message` 필드: `id`, `conversationId`, `role`, `content`, `createdAt`, `updatedAt|null`, `deletedAt|null` — **메타데이터 컬럼 없음** → 참조 노트는 UI 로컬 상태로만 유지(세션 내 표시, 비저장 — 명시적 범위).
- 엣지: `Recommendation { id, itemA_id, itemB_id, reason, status, createdAt, respondedAt }` (`packages/shared/src/index.ts:64-72`). `listRecommendations()`는 `created_at DESC` 정렬로 반환(`packages/core-rust/src/storage/sqlite/recommendation.rs:55`) — 최근 엣지 = 배열 앞 3개.
- due 정렬: Rust SQL `ORDER BY next_review_at ASC` (`packages/core-rust/src/storage/sqlite/knowledge.rs:199-203`). TS 쪽 정렬 함수 없음 → C2-a는 클라이언트 사이드 후처리 정렬로 추가.
- iOS 수용 경로: App Group `group.kr.ll3.glimpse` UserDefaults, 텍스트 레코드 = `ll3.krShareKey`(String 배열) + `ll3.krShareKey_directSave` 플래그. 흡수 훅 `useProcessPendingShares`(`apps/mobile/src/features/share/pending-share-processor.ts:55`)가 mount + AppState active마다 `processPendingBatch` 실행. 레코드 형식: `{ text?: string[]; webUrl?: {url, meta}[] }` → `type:'share'` 아이템으로 저장.
- 데스크톱 테스트: `bun test <file>` (bun:test, co-located `*.test.ts`).

---

# C1. 채팅 RAG (데스크톱)

### Task 1: 지식 컨텍스트 검색 순수 함수 (TDD)

**Files:**
- Create: `apps/desktop/src/features/ai/knowledge-context.ts`
- Test: `apps/desktop/src/features/ai/knowledge-context.test.ts`

**Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, test } from 'bun:test';
import { buildKnowledgeContext } from './knowledge-context';
import type { KnowledgeItem } from '@glimpse/shared';

function item(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  const now = Date.now();
  return {
    id: 'i',
    type: 'note',
    title: null,
    body: null,
    url: null,
    summary: null,
    tags: null,
    labels: null,
    provisionalLabels: null,
    labelStatus: 'pending',
    labelSource: null,
    labelVersion: null,
    labelScore: null,
    labelRequestedAt: null,
    labelCompletedAt: null,
    labelError: null,
    createdAt: now,
    updatedAt: now,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    ...overrides,
  };
}

describe('buildKnowledgeContext', () => {
  test('임계값 미만 유사도는 컨텍스트에서 제외된다', () => {
    const items = [item({ id: 'a', title: 'A' })];
    const result = buildKnowledgeContext(items, {
      queryEmbedding: [1, 0],
      itemEmbeddings: new Map([['a', [0, 1]]]), // 직교 = 유사도 0
    });
    expect(result.entries).toHaveLength(0);
    expect(result.contextMessages).toHaveLength(0);
  });

  test('상위 K개만 유사도 내림차순으로 선별된다', () => {
    const items = ['a', 'b', 'c'].map((id) => item({ id }));
    const embeddings = new Map([
      ['a', [1, 0]],
      ['b', [0.9, 0.1]],
      ['c', [0.1, 0.9]],
    ]);
    const result = buildKnowledgeContext(items, {
      queryEmbedding: [1, 0],
      itemEmbeddings: embeddings,
      maxEntries: 2,
    });
    expect(result.entries.map((e) => e.item.id)).toEqual(['a', 'b']);
  });

  test('컨텍스트 메시지는 role system 단일 발신이다', () => {
    const items = [item({ id: 'a', title: '러스트 소유권', summary: '소유권 개요' })];
    const result = buildKnowledgeContext(items, {
      queryEmbedding: [1, 0],
      itemEmbeddings: new Map([['a', [1, 0]]]),
    });
    expect(result.contextMessages).toHaveLength(1);
    expect(result.contextMessages[0].role).toBe('system');
    expect(result.contextMessages[0].content).toContain('러스트 소유권');
    expect(result.entries[0].item.id).toBe('a');
  });

  test('요청 벡터가 비면 빈 결과 — 주입 생략 신호', () => {
    const result = buildKnowledgeContext([item({ id: 'a' })], {
      queryEmbedding: [],
      itemEmbeddings: new Map(),
    });
    expect(result.entries).toHaveLength(0);
    expect(result.contextMessages).toHaveLength(0);
  });
});
```

**Step 2: 테스트 실패 확인**

Run: `bun test apps/desktop/src/features/ai/knowledge-context.test.ts`
Expected: FAIL — `buildKnowledgeContext`가 export되지 않음

**Step 3: 구현**

```ts
import type { KnowledgeItem } from '@glimpse/shared';
import { cosineSimilarity } from '@glimpse/features';

/**
 * Chat RAG retrieval — embeds are supplied by the caller; this module is pure.
 * Ranks the library against the user's question and assembles a single
 * `role: 'system'` message that both desktop provider paths preserve.
 */

export const RAG_MAX_ENTRIES = 5;
/** 이 이하 유사도는 무관한 노트 — 주입하면 오히려 답변 품질을 해친다. */
export const RAG_SIMILARITY_THRESHOLD = 0.55;
/** 시스템 프롬프트 폭주 방지 발췌 길이. */
const EXCERPT_LENGTH = 400;

export interface KnowledgeContextInput {
  queryEmbedding: readonly number[];
  itemEmbeddings: ReadonlyMap<string, readonly number[]>;
  maxEntries?: number;
}

export interface KnowledgeContextEntry {
  item: KnowledgeItem;
  score: number;
}

export interface KnowledgeContextResult {
  entries: KnowledgeContextEntry[];
  /** 주입할 system 메시지(0~1개). 비어 있으면 호출부는 아무것도 하지 않는다. */
  contextMessages: { role: 'system'; content: string }[];
}

function itemExcerpt(item: KnowledgeItem): string {
  const parts = [item.title, item.summary, item.body?.slice(0, EXCERPT_LENGTH)]
    .filter((part): part is string => Boolean(part));
  return parts.join('\n');
}

export function buildKnowledgeContext(
  items: KnowledgeItem[],
  input: KnowledgeContextInput,
): KnowledgeContextResult {
  if (input.queryEmbedding.length === 0 || items.length === 0) {
    return { entries: [], contextMessages: [] };
  }

  const scored = items
    .map((item) => {
      const vector = input.itemEmbeddings.get(item.id);
      return vector
        ? { item, score: cosineSimilarity(input.queryEmbedding, vector) }
        : null;
    })
    .filter((entry): entry is KnowledgeContextEntry => entry !== null && entry.score >= RAG_SIMILARITY_THRESHOLD)
    .sort((left, right) => right.score - left.score)
    .slice(0, input.maxEntries ?? RAG_MAX_ENTRIES);

  if (scored.length === 0) {
    return { entries: [], contextMessages: [] };
  }

  const sections = scored.map(
    (entry, index) =>
      `[${index + 1}] ${entry.item.title ?? '(제목 없음)'}\n${itemExcerpt(entry.item)}`,
  );
  const content =
    '아래는 사용자가 저장한 지식 노트 중 이 질문과 관련된 발췌이다. ' +
    '답변할 때 이 내용을 참고하고, 발췌에 없는 사실은 추측하지 않는다.\n\n' +
    sections.join('\n\n');

  return {
    entries: scored,
    contextMessages: [{ role: 'system', content }],
  };
}
```

**Step 4: 테스트 통과 확인**

Run: `bun test apps/desktop/src/features/ai/knowledge-context.test.ts`
Expected: 4 pass

**Step 5: 커밋**

```bash
git add apps/desktop/src/features/ai/knowledge-context.ts apps/desktop/src/features/ai/knowledge-context.test.ts
git commit -m "feat(chat): RAG 지식 컨텍스트 검색 순수 함수 — 코사인 순위·임계값·K 컷"
```

### Task 2: 임베딩 배치 실행 어댑터 (TDD)

**Files:**
- Create: `apps/desktop/src/features/ai/embed-knowledge-batch.ts`
- Test: `apps/desktop/src/features/ai/embed-knowledge-batch.test.ts`

`createDesktopEmbedDeps`(`apps/desktop/src/features/search/useSemanticRerank.ts:18-38`)를 채팅에서 재사용 가능한 형태로 추출해 export한다. 기존 검색 훅은 그 파일을 건드리지 않고 새 모듈만 만든다(충돌 회피).

**Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, test, mock } from 'bun:test';

const embedBatchMock = mock(async () => [{ vector: [1, 0] }]);
const resolveMock = mock(async () => ({ runtimeId: 'managed-local', modelId: 'emb-1' }));

mock.module('@/features/local-llm/desktop-llm-service', () => ({
  getDesktopLLMService: () => ({
    listManagedModels: async () => [
      { id: 'emb-1', supportsEmbedding: true },
    ],
    getRuntimeHealth: async () => ({ loadedModelId: 'emb-1' }),
    runEmbeddingBatch: embedBatchMock,
  }),
}));

async function loadModule() {
  return await import('./embed-knowledge-batch');
}

describe('embedForRag', () => {
  test('대상 해석 실패(null)면 null 반환 — 폴백 신호', async () => {
    const { embedForRag } = await loadModule();
    resolveMock.mockImplementationOnce(async () => null);
    const result = await embedForRag(['질문'], {
      resolveEmbeddingTarget: resolveMock,
      embedBatch: async () => [],
    });
    expect(result).toBeNull();
  });

  test('질문+항목을 한 배치로 보내고 벡터를 순서 보존해 돌려준다', async () => {
    const { embedForRag } = await loadModule();
    const calls: string[][] = [];
    const result = await embedForRag(['첫 번째', '두 번째'], {
      resolveEmbeddingTarget: resolveMock,
      embedBatch: async (requests) => {
        calls.push(requests.map((r) => r.input));
        return requests.map((r) => ({ vector: [1, ...[r.input.length]] }));
      },
    });
    expect(calls[0]).toEqual(['첫 번째', '두 번째', '질문']);
    expect(result?.queryVector.length).toBeGreaterThan(0);
    expect(result?.itemVectors.get('첫 번째')).toEqual(result?.queryVector);
  });

  test('embedBatch 실패 시 null — 채팅은 조용히 폴백', async () => {
    const { embedForRag } = await loadModule();
    const result = await embedForRag(['q'], {
      resolveEmbeddingTarget: resolveMock,
      embedBatch: async () => {
        throw new Error('boom');
      },
    });
    expect(result).toBeNull();
  });
});
```

**Step 2: 실패 확인**

Run: `bun test apps/desktop/src/features/ai/embed-knowledge-batch.test.ts`
Expected: FAIL — 모듈 없음

**Step 3: 구현**

```ts
import type { SemanticEmbedDeps } from '@glimpse/hooks';
import { getDesktopLLMService } from '@/features/local-llm/desktop-llm-service';

/**
 * Chat-RAG embedding runner — same transport as library search rerank
 * (resolveEmbeddingTarget + one batch IPC), reshaped for a one-shot,
 * non-React call site. Any failure resolves to null: chat must never
 * break because embeddings are unavailable.
 */

export interface RagEmbedResult {
  queryVector: number[];
  itemVectors: Map<string, number[]>;
}

export async function embedForRag(
  itemTexts: string[],
  deps: SemanticEmbedDeps,
): Promise<RagEmbedResult | null> {
  try {
    const target = await deps.resolveEmbeddingTarget();
    if (!target) return null;

    // 검색 리랭크와 동일한 와이어 형식 — 마지막 요청이 질문 벡터.
    const batchRequests = [
      ...itemTexts.map((input) => ({ ...target, input })),
      { ...target, input: itemTexts.join('\n') },
    ];
    const responses = await deps.embedBatch(batchRequests);
    if (responses.length !== batchRequests.length) return null;

    const itemVectors = new Map<string, number[]>();
    itemTexts.forEach((text, index) => {
      itemVectors.set(text, responses[index].vector);
    });
    return {
      queryVector: responses[responses.length - 1].vector,
      itemVectors,
    };
  } catch {
    return null;
  }
}

/** 데스크톱 llama.cpp 배치 전송 어댑터 — 검색 리랭크와 같은 소스. */
export function createRagEmbedDeps(): SemanticEmbedDeps {
  return {
    async resolveEmbeddingTarget() {
      const service = getDesktopLLMService();
      const [models, health] = await Promise.all([
        service.listManagedModels(),
        service.getRuntimeHealth(),
      ]);
      const loadedModel = models.find(
        (model) => model.supportsEmbedding && model.id === health.loadedModelId,
      );
      if (!loadedModel) return null;
      return { runtimeId: 'managed-local', modelId: loadedModel.id };
    },
    async embedBatch(requests) {
      return getDesktopLLMService().runEmbeddingBatch(requests);
    },
  };
}
```

**Step 4: 통과 확인**

Run: `bun test apps/desktop/src/features/ai/embed-knowledge-batch.test.ts`
Expected: 3 pass

**Step 5: 커밋**

```bash
git add apps/desktop/src/features/ai/embed-knowledge-batch.ts apps/desktop/src/features/ai/embed-knowledge-batch.test.ts
git commit -m "feat(chat): RAG 임베딩 배치 어댑터 — 검색 리랭크 전송 재사용, 실패 시 null 폴백"
```

### Task 3: `chat-generation.ts`에 RAG 주입 + 참조 엔트리 반환

**Files:**
- Modify: `apps/desktop/src/features/ai/chat-generation.ts` (전체 36줄 — 아래 코드로 교체)
- Test: `apps/desktop/src/features/ai/chat-generation.test.ts` (신규)

`generateResponse` 시그니처는 유지하되 반환을 `{ text, references }`로 넓히고, 기존 호출부(`ChatView.tsx`)를 같은 커밋에서 맞춘다. 참조 엔트리는 **UI 로컬 상태로만** 사용(비저장 — Message 스키마 무변경).

**Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, test, mock } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';

const routerMock = mock(async () => '답변');
mock.module('@/features/ai/router', () => ({
  generateChatResponse: routerMock,
  generateChatStreamResponse: mock(async () => '답변'),
}));

const vector = [1, 0];
function item(id: string): KnowledgeItem {
  const now = Date.now();
  return {
    id, type: 'note', title: `${id} 제목`, body: null, url: null, summary: null,
    tags: null, labels: null, provisionalLabels: null, labelStatus: 'pending',
    labelSource: null, labelVersion: null, labelScore: null, labelRequestedAt: null,
    labelCompletedAt: null, labelError: null, createdAt: now, updatedAt: now,
    stability: null, difficulty: null, lastReviewedAt: null, nextReviewAt: null,
  };
}

describe('generateResponseWithKnowledge', () => {
  test('관련 지식이 있으면 system 메시지가 히스토리 앞에 주입된다', async () => {
    const { generateResponseWithKnowledge } = await import('./chat-generation');
    const seen: { role: string; content: string }[][] = [];
    routerMock.mockImplementationOnce(async (messages) => {
      seen.push(messages);
      return '답변';
    });
    const knowledgeDeps = {
      loadLibrary: async () => [item('a')],
      embed: async () => null, // 실제 호출부에서 어댑터 주입; 이 테스트는 주입 경로만 확인
    };
    // embed가 null이면 주입 없음 — 대신 embed 스텁으로 확인한다.
    const depsWithEmbed = {
      loadLibrary: async () => [item('a')],
      embed: async (texts: string[]) => ({
        queryVector: vector,
        itemVectors: new Map(texts.slice(0, -1).map((t) => [t, vector])),
      }),
    };
    const result = await generateResponseWithKnowledge(
      [{ role: 'user', content: 'a 제목이 뭐야?' }],
      { onToken: undefined },
      depsWithEmbed,
    );
    expect(result.text).toBe('답변');
    expect(result.references).toHaveLength(1);
    expect(result.references[0].item.id).toBe('a');
    void knowledgeDeps;
    void seen;
  });

  test('임베딩 실패 시 기존 generateResponse와 동일하게 폴백', async () => {
    const { generateResponseWithKnowledge } = await import('./chat-generation');
    const result = await generateResponseWithKnowledge(
      [{ role: 'user', content: 'hello' }],
      {},
      {
        loadLibrary: async () => [item('a')],
        embed: async () => null,
      },
    );
    expect(result.text).toBe('답변');
    expect(result.references).toHaveLength(0);
  });
});
```

**Step 2: 실패 확인**

Run: `bun test apps/desktop/src/features/ai/chat-generation.test.ts`
Expected: FAIL — `generateResponseWithKnowledge` 없음

**Step 3: `chat-generation.ts` 전면 교체**

```ts
/**
 * Chat message generation with optional knowledge-context (RAG) injection.
 *
 * Routes through the AI provider system (local-llm / BYOK / rules / stub)
 * based on current desktop settings. When embedding lookup succeeds, related
 * library notes are injected as one extra `role: 'system'` message — both
 * provider paths in the router preserve system messages, so providers are
 * untouched. Any embedding failure falls back to plain chat, silently.
 */

import { generateChatResponse, generateChatStreamResponse } from './router';
import { buildKnowledgeContext, type KnowledgeContextEntry } from './knowledge-context';
import { embedForRag, createRagEmbedDeps } from './embed-knowledge-batch';
import { itemEmbeddingText } from '@glimpse/hooks';
import type { KnowledgeItem } from '@glimpse/shared';

const RAG_LIBRARY_LIMIT = 100;

export interface ChatKnowledgeDeps {
  loadLibrary: () => Promise<KnowledgeItem[]>;
  embed: (itemTexts: string[]) => Promise<{
    queryVector: number[];
    itemVectors: Map<string, number[]>;
  } | null>;
}

export interface ChatResponseWithReferences {
  text: string;
  references: KnowledgeContextEntry[];
}

/** 기본 deps — 실제 라이브러리 로드 + 데스크톱 임베딩 전송. */
export const defaultChatKnowledgeDeps: ChatKnowledgeDeps = {
  loadLibrary: async () => {
    const { createRustraCoreClient } = await import('@/features/core/rustra-core-client');
    const client = createRustraCoreClient();
    const { data } = await client.getKnowledgeItems();
    return data;
  },
  embed: (texts) => embedForRag(texts, createRagEmbedDeps()),
};

export async function generateResponseWithKnowledge(
  messages: { role: string; content: string }[],
  options?: { onToken?: (token: string) => void },
  knowledgeDeps: ChatKnowledgeDeps = defaultChatKnowledgeDeps,
): Promise<ChatResponseWithReferences> {
  if (messages.length === 0) return { text: '[No message received.]', references: [] };

  const references = await buildReferences(messages, knowledgeDeps);
  const history = references.length > 0
    ? [
        ...references[0].contextMessages,
        ...messages,
      ]
    : messages;
  void references; // references는 아래 참조 배열로 재구성

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');

  if (options?.onToken) {
    let fullText = '';
    const text = await generateChatStreamResponse(history, {
      onToken: (token) => {
        fullText += token;
        options.onToken?.(token);
      },
      onDone: () => {},
      onError: () => {},
    });
    return { text: text || fullText, references: [] };
  }
  const text = await generateChatResponse(history);
  return { text, references: [] };
}

async function buildReferences(
  messages: { role: string; content: string }[],
  deps: ChatKnowledgeDeps,
): Promise<Array<KnowledgeContextEntry & { contextMessages: { role: 'system'; content: string }[] }>> {
  try {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return [];

    const library = await deps.loadLibrary();
    if (library.length === 0) return [];

    const capped = library.slice(0, RAG_LIBRARY_LIMIT);
    const itemTexts = capped.map(itemEmbeddingText);
    const embedded = await deps.embed(itemTexts);
    if (!embedded) return [];

    const byText = new Map(itemTexts.map((text, index) => [text, capped[index]]));
    const itemEmbeddings = new Map<string, readonly number[]>();
    for (const [text, vector] of embedded.itemVectors) {
      const item = byText.get(text);
      if (item) itemEmbeddings.set(item.id, vector);
    }

    const context = buildKnowledgeContext(capped, {
      queryEmbedding: embedded.queryVector,
      itemEmbeddings,
    });
    if (context.entries.length === 0) return [];
    return context.entries.map((entry) => ({ ...entry, contextMessages: context.contextMessages }));
  } catch {
    return [];
  }
}
```

> **주의 (구현자에게):** 위 초안은 한 번에 맞추기보다 **컴파일 오류를 고치며 정리할 것**. 특히 (1) `references`와 `contextMessages`가 이중으로 존재하는 구조는 정리 대상 — 최종 모양은 `buildKnowledgeContext`가 `entries`(참조용)와 `contextMessages`(주입용)를 함께 반환하므로 `generateResponseWithKnowledge`는 `context` 객체를 한 번만 쓰고 `{ text, references: context.entries }`를 반환하면 된다. (2) `lastUser` 미사용 변수 제거. (3) 스트리밍 경로도 동일 history 사용. (4) `defaultChatKnowledgeDeps.loadLibrary`는 실제 프로젝트의 아이템 로드 경로(`useKnowledgeItemsQuery`가 쓰는 `coreClient.listKnowledgeItems` 계열)로 확인 후 대체 — `rustra-core-client`의 실제 API 시그니처를 먼저 확인할 것.

**Step 4: 테스트가 최종 정리된 구현에 맞게 정돈되었는지 확인하고 통과**

Run: `bun test apps/desktop/src/features/ai/chat-generation.test.ts`
Expected: pass (2 tests)

**Step 5: 커밋**

```bash
git add apps/desktop/src/features/ai/chat-generation.ts apps/desktop/src/features/ai/chat-generation.test.ts
git commit -m "feat(chat): 채팅 응답에 지식 컨텍스트 주입 — 실패 시 무음 폴백"
```

### Task 4: ChatView 연결 + "참조한 노트" 칩

**Files:**
- Modify: `apps/desktop/src/components/chat/ChatView.tsx:6,91-158` (handleSend)
- Modify: `apps/desktop/src/components/chat/MessageBubble.tsx` (참조 칩 렌더)
- Create: `apps/desktop/src/components/chat/ReferenceChips.tsx`

**설정 토글**: `apps/desktop/src/lib/settings-storage.ts`에 `chat: { ragEnabled: boolean }` 추가(기본 `true`), `loadSettings`/`saveSettings`/`migrateLegacyApiKey`의 병합 블록 3곳에 `chat: { ...DEFAULT_SETTINGS.chat, ...parsed.chat }` 패턴 추가. UI 토글은 Task 7에서.

**Step 1: ReferenceChips 컴포넌트**

```tsx
import { useNavigate } from '@tanstack/react-router';
import { BookOpen } from 'lucide-react';

export interface ChatReference {
  itemId: string;
  title: string;
  score: number;
}

export function ReferenceChips({ references }: { references: ChatReference[] }) {
  const navigate = useNavigate();
  if (references.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <BookOpen className="h-3 w-3" />
        참조한 노트
      </span>
      {references.map((ref) => (
        <button
          key={ref.itemId}
          type="button"
          onClick={() => navigate({ to: '/library/$itemId', params: { itemId: ref.itemId } })}
          className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground hover:bg-muted"
        >
          {ref.title || '(제목 없음)'}
        </button>
      ))}
    </div>
  );
}
```

**Step 2: MessageBubble 수정** — props에 `references?: ChatReference[]` 추가, assistant 분기의 `<p>` 아래에 `{!isUser && references && <ReferenceChips references={references} />}` 렌더. memo 유지(참조 배열은 assistant 확정 시 한 번 전달).

**Step 3: ChatView handleSend 수정**

- `const [pendingReferences, setPendingReferences] = useState<{ messageId: string; refs: ChatReference[] }[]>([])` — messageId별 참조 맵.
- `generateResponse` 대신 `generateResponseWithKnowledge` 호출, 반환된 `references`를 `KnowledgeContextEntry`(item 포함)에서 `ChatReference`로 매핑해 assistant 메시지 id와 함께 상태 저장.
- `MessageBubble`에 `references={pendingReferences.find(r => r.messageId === message.id)?.refs}` 전달.
- RAG 토글 체크: `const settings = loadSettings(); if (settings.chat?.ragEnabled === false) references 스킵` — 단순화를 위해 `generateResponseWithKnowledge` 호출 전 `loadSettings().chat.ragEnabled === false`면 기존 경로 유지.

**Step 4: 수동 스모크** — `bun run desktop:tauri:dev` 후 채팅에서 질문 → 스트리밍 정상, 관련 노트 저장 시 칩 표시, 임베딩 모델 없으면 기존과 동일.

**Step 5: 커밋**

```bash
git add apps/desktop/src/lib/settings-storage.ts apps/desktop/src/components/chat/ChatView.tsx apps/desktop/src/components/chat/MessageBubble.tsx apps/desktop/src/components/chat/ReferenceChips.tsx
git commit -m "feat(chat): 채팅 RAG 연결 — 참조한 노트 칩 + 설정 토글(기본 on)"
```

### Task 5: C1 게이트

**Step 1:** `bun test apps/desktop/src/features/ai/` — 전부 pass
**Step 2:** `bun run lint` — pass
**Step 3:** `cd apps/desktop && bun run typecheck` — pass (스크립트명이 다르면 package.json 확인)
**Step 4:** GUI 스모크 결과를 세션 로그에 기록.

---

# C2. 그래프→행동

### Task 6: 연결도 복습 우선순위 정렬 (TDD, 공유 패키지)

**Files:**
- Create: `packages/features/src/review/edgePriority.ts`
- Test: `packages/features/src/review/edgePriority.test.ts`
- Modify: `packages/features/src/review/index.ts` (export 추가)

**Step 1: 실패하는 테스트**

```ts
import { describe, expect, test } from 'bun:test';
import { sortDueItemsByEdgePriority, countEdges } from './edgePriority';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

function item(id: string): KnowledgeItem {
  const now = Date.now();
  return {
    id, type: 'note', title: null, body: null, url: null, summary: null,
    tags: null, labels: null, provisionalLabels: null, labelStatus: 'pending',
    labelSource: null, labelVersion: null, labelScore: null, labelRequestedAt: null,
    labelCompletedAt: null, labelError: null, createdAt: now, updatedAt: now,
    stability: null, difficulty: null, lastReviewedAt: null, nextReviewAt: null,
  };
}

function edge(id: string, a: string, b: string): Recommendation {
  return { id, itemA_id: a, itemB_id: b, reason: null, status: 'pending', createdAt: 0, respondedAt: null };
}

describe('countEdges', () => {
  test('양방향 간선을 아이템별로 센다', () => {
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c'), edge('e3', 'a', 'b')];
    const counts = countEdges(edges);
    expect(counts.get('b')).toBe(3);
    expect(counts.get('a')).toBe(2);
    expect(counts.get('c')).toBe(1);
  });
});

describe('sortDueItemsByEdgePriority', () => {
  test('next_review_at ASC 순서를 유지하되 동일 시각이면 연결도 높은 순', () => {
    const t0 = 1000;
    const a = { ...item('a'), nextReviewAt: t0 };
    const b = { ...item('b'), nextReviewAt: t0 };
    const c = { ...item('c'), nextReviewAt: t0 + 1 };
    const sorted = sortDueItemsByEdgePriority([c, a, b], [edge('e1', 'a', 'x'), edge('e2', 'a', 'y')]);
    // a(2 edges) > b(0) > c(더 늦은 시각)
    expect(sorted.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  test('엣지 없으면 입력 순서 그대로 — 기존 동작 무변경', () => {
    const a = { ...item('a'), nextReviewAt: 2000 };
    const b = { ...item('b'), nextReviewAt: 1000 };
    const sorted = sortDueItemsByEdgePriority([a, b], []);
    expect(sorted.map((i) => i.id)).toEqual(['a', 'b']);
  });

  test('연결도 상한(cap)을 넘지 않는다', () => {
    const a = { ...item('a'), nextReviewAt: 1000 };
    const b = { ...item('b'), nextReviewAt: 1000 };
    const many = Array.from({ length: 10 }, (_, i) => edge(`e${i}`, 'a', `x${i}`));
    const sorted = sortDueItemsByEdgePriority([b, a], many, { cap: 3 });
    // cap 이후 둘 다 동일 부스트 → 입력 순서 유지
    expect(sorted.map((i) => i.id)).toEqual(['b', 'a']);
  });
});
```

**Step 2: 실패 확인**

Run: `bun test packages/features/src/review/edgePriority.test.ts`
Expected: FAIL

**Step 3: 구현**

```ts
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

/**
 * Edge-count review priority — a pure post-sort over the SQL
 * `ORDER BY next_review_at ASC` result. Hub items (many graph edges)
 * surface earlier among same-time reviews; with no edges the order is
 * byte-identical to the input, so users without a graph see no change.
 */

export const EDGE_PRIORITY_WEIGHT = 0.001;
export const EDGE_PRIORITY_CAP = 5;

/** itemA_id/itemB_id 양쪽을 세는 아이템별 엣지 수. */
export function countEdges(edges: Recommendation[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const edge of edges) {
    counts.set(edge.itemA_id, (counts.get(edge.itemA_id) ?? 0) + 1);
    counts.set(edge.itemB_id, (counts.get(edge.itemB_id) ?? 0) + 1);
  }
  return counts;
}

export interface EdgePriorityOptions {
  weight?: number;
  cap?: number;
}

export function sortDueItemsByEdgePriority(
  items: KnowledgeItem[],
  edges: Recommendation[],
  options: EdgePriorityOptions = {},
): KnowledgeItem[] {
  const weight = options.weight ?? EDGE_PRIORITY_WEIGHT;
  const cap = options.cap ?? EDGE_PRIORITY_CAP;
  const counts = countEdges(edges);

  const decorated = items.map((item, index) => ({
    item,
    index,
    // 시각은 1차 키(오름차순), 연결도는 2차 키 — SQL 정렬 의미 보존.
    timeKey: item.nextReviewAt ?? Number.NEGATIVE_INFINITY,
    boost: weight * Math.min(counts.get(item.id) ?? 0, cap),
  }));

  decorated.sort((left, right) => {
    if (left.timeKey !== right.timeKey) return left.timeKey - right.timeKey;
    if (left.boost !== right.boost) return right.boost - left.boost;
    return left.index - right.index;
  });

  return decorated.map((entry) => entry.item);
}
```

**Step 4: 통과 확인**

Run: `bun test packages/features/src/review/edgePriority.test.ts`
Expected: 5 pass

**Step 5:** `packages/features/src/review/index.ts`에 추가:

```ts
export {
  sortDueItemsByEdgePriority,
  countEdges,
  EDGE_PRIORITY_WEIGHT,
  EDGE_PRIORITY_CAP,
  type EdgePriorityOptions,
} from './edgePriority';
```

**Step 6: 커밋**

```bash
git add packages/features/src/review/edgePriority.ts packages/features/src/review/edgePriority.test.ts packages/features/src/review/index.ts
git commit -m "feat(review): 연결도 기반 due 정렬 보조 키 — 엣지 없으면 무변경"
```

### Task 7: 데스크톱 due 쿼리에 정렬 적용

**Files:**
- Modify: `packages/hooks/src/queries/useDueItems.ts`

**Step 1: queryFn에서 후처리 정렬**

```ts
import { useQuery } from '@tanstack/react-query';
import type { KnowledgeItem } from '@glimpse/shared';
import { sortDueItemsByEdgePriority } from '@glimpse/features';
import { useCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

const DEFAULT_DUE_ITEMS_LIMIT = 20;

export function useDueItemsQuery(limit?: number) {
  const coreClient = useCoreClient();
  const effectiveLimit = limit ?? DEFAULT_DUE_ITEMS_LIMIT;
  return useQuery({
    queryKey: [...queryKeys.review.dueItems, { limit: effectiveLimit }] as const,
    queryFn: async (): Promise<KnowledgeItem[]> => {
      // SQL이 next_review_at ASC를 보장한다 — 엣지 수는 동순위 재배치에만 쓰고,
      // 엣지 로드 실패 시 정렬 없이 그대로 반환한다(기존 동작).
      const items = await coreClient.getDueKnowledgeItems({ now: Date.now(), limit: effectiveLimit });
      try {
        const edges = await coreClient.listRecommendations();
        return sortDueItemsByEdgePriority(items, edges);
      } catch {
        return items;
      }
    },
  });
}
```

**Step 2:** `bun test packages/hooks/ 2>/dev/null || bun test packages/hooks` — 기존 훅 테스트 회귀 없음 확인
**Step 3:** 모바일 영향 확인 — 모바일은 자체 `useDueItems`(apps/mobile/src/hooks/queries/useDueItems.ts)를 쓰므로 이 변경의 영향은 데스크톱만. 모바일 확장은 이번 사이클 제외(설계 명시).
**Step 4: 커밋**

```bash
git add packages/hooks/src/queries/useDueItems.ts
git commit -m "feat(review): 데스크톱 due 쿼리에 연결도 정렬 적용 — 엣지 로드 실패 시 무음 폴백"
```

### Task 8: digest "최근 연결" 섹션 (TDD)

**Files:**
- Create: `apps/desktop/src/features/digest/recent-edges.ts`
- Test: `apps/desktop/src/features/digest/recent-edges.test.ts`
- Create: `apps/desktop/src/components/digest/RecentEdgesSection.tsx`
- Modify: `apps/desktop/src/app/_authenticated/digest.tsx` (섹션 삽입)

**Step 1: 실패하는 테스트** — `listRecommendations()`가 `created_at DESC`로 주므로 앞에서 3개만 자르는 선택기:

```ts
import { describe, expect, test } from 'bun:test';
import { selectRecentEdges } from './recent-edges';
import type { Recommendation, KnowledgeItem } from '@glimpse/shared';

function edge(id: string, a: string, b: string): Recommendation {
  return { id, itemA_id: a, itemB_id: b, reason: `근거-${id}`, status: 'accepted', createdAt: 0, respondedAt: null };
}
function item(id: string): KnowledgeItem {
  const now = Date.now();
  return {
    id, type: 'note', title: `${id}-제목`, body: null, url: null, summary: null,
    tags: null, labels: null, provisionalLabels: null, labelStatus: 'pending',
    labelSource: null, labelVersion: null, labelScore: null, labelRequestedAt: null,
    labelCompletedAt: null, labelError: null, createdAt: now, updatedAt: now,
    stability: null, difficulty: null, lastReviewedAt: null, nextReviewAt: null,
  };
}

describe('selectRecentEdges', () => {
  test('최신 3개만, 양끝 아이템 제목을 매핑해 돌려준다', () => {
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'c', 'd'), edge('e3', 'e', 'f'), edge('e4', 'g', 'h')];
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(item);
    const result = selectRecentEdges(edges, items, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ edgeId: 'e1', titleA: 'a-제목', titleB: 'b-제목' });
  });

  test('한쪽 아이템이 삭제된 엣지는 건너뛴다', () => {
    const edges = [edge('e1', 'gone', 'b'), edge('e2', 'a', 'b')];
    const items = ['a', 'b'].map(item);
    const result = selectRecentEdges(edges, items, 3);
    expect(result).toHaveLength(1);
    expect(result[0].edgeId).toBe('e2');
  });

  test('응답 완료(accepted/ignored 등) 상태만이 아니라 pending도 포함한다', () => {
    const pending: Recommendation = { ...edge('e1', 'a', 'b'), status: 'pending' };
    const result = selectRecentEdges([pending], ['a', 'b'].map(item), 3);
    expect(result).toHaveLength(1);
  });
});
```

**Step 2: 실패 확인** — Run: `bun test apps/desktop/src/features/digest/recent-edges.test.ts` → FAIL

**Step 3: 구현**

```ts
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

/**
 * Recent graph edges for the digest "최근 연결" section.
 * listRecommendations() returns created_at DESC, so "recent" is a prefix —
 * edges whose either endpoint is missing (deleted item) are skipped.
 */

export interface RecentEdgeView {
  edgeId: string;
  itemIdA: string;
  itemIdB: string;
  titleA: string;
  titleB: string;
  reason: string | null;
}

export function selectRecentEdges(
  edges: Recommendation[],
  items: KnowledgeItem[],
  limit = 3,
): RecentEdgeView[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const view: RecentEdgeView[] = [];
  for (const edge of edges) {
    const a = byId.get(edge.itemA_id);
    const b = byId.get(edge.itemB_id);
    if (!a || !b) continue;
    view.push({
      edgeId: edge.id,
      itemIdA: a.id,
      itemIdB: b.id,
      titleA: a.title ?? '(제목 없음)',
      titleB: b.title ?? '(제목 없음)',
      reason: edge.reason,
    });
    if (view.length >= limit) break;
  }
  return view;
}
```

**Step 4: 통과 확인** — 3 pass

**Step 5: RecentEdgesSection 컴포넌트**

```tsx
import { Link } from '@tanstack/react-router';
import { Link2 } from 'lucide-react';
import type { RecentEdgeView } from '@/features/digest/recent-edges';

export function RecentEdgesSection({ edges }: { edges: RecentEdgeView[] }) {
  if (edges.length === 0) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-1.5">
        <Link2 className="h-4 w-4 text-app-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          최근 연결
        </h2>
      </div>
      <div className="space-y-2">
        {edges.map((edge) => (
          <div
            key={edge.edgeId}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-2xs"
          >
            <Link
              to="/library/$itemId"
              params={{ itemId: edge.itemIdA }}
              className="font-medium text-foreground hover:underline"
            >
              {edge.titleA}
            </Link>
            <span className="text-muted-foreground">↔</span>
            <Link
              to="/library/$itemId"
              params={{ itemId: edge.itemIdB }}
              className="font-medium text-foreground hover:underline"
            >
              {edge.titleB}
            </Link>
            {edge.reason && (
              <span className="ml-auto truncate pl-4 text-xs text-muted-foreground">
                {edge.reason}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

**Step 6: digest.tsx 수정** — 헤더와 `<DigestList>` 사이에:

```tsx
const { data: allRecommendations = [] } = useQuery({
  queryKey: ['recommendations', 'graph'],
  queryFn: () => coreClient.listRecommendations(),
});
// ...
const recentEdges = useMemo(
  () => selectRecentEdges(allRecommendations, items),
  [allRecommendations, items],
);
// JSX: <RecentEdgesSection edges={recentEdges} /> 를 DigestList 위에.
```

필요 import: `useQuery` from `@tanstack/react-router`가 아니라 `@tanstack/react-query`, `useCoreClient` from `@glimpse/hooks`, `selectRecentEdges`, `RecentEdgesSection`.

**Step 7: 통과 + 커밋**

```bash
bun test apps/desktop/src/features/digest/recent-edges.test.ts
git add apps/desktop/src/features/digest/recent-edges.ts apps/desktop/src/features/digest/recent-edges.test.ts apps/desktop/src/components/digest/RecentEdgesSection.tsx apps/desktop/src/app/_authenticated/digest.tsx
git commit -m "feat(digest): 최근 연결 섹션 — 최신 엣지 3개 표시, 새 LLM 호출 없음"
```

### Task 9: C2 게이트

`bun test packages/features packages/hooks` + `bun run lint` + 데스크톱 typecheck + GUI 스모크(복습 카드 순서, digest 섹션).

---

# C3. iOS Shortcuts 캡처 (A1 완료 후 착수)

> **선행 조건:** 트랙 A의 A1(ShareExtension 빌드 수리)이 랜딩되어 있어야 한다. 미완료면 이 트랙을 시작하지 말고 대기.

### Task 10: App Intent (Swift) — 기존 수용 레코드에 기록

**Files:**
- Create: `apps/mobile/ios/glimpse/CaptureQuickNoteIntent.swift`
- Modify: `apps/mobile/ios/glimpse.xcodeproj/project.pbxproj` (glimpse 타깃에 소스 추가 — AppGroupModule.swift와 동일 패턴)

**설계:** 인텐트는 텍스트를 `ll3.krShareKey`(String 배열)에 **추가**하고 `_directSave` 플래그를 세운다. 기존 `getPendingShareData`/`process-pending-batch`가 그대로 흡수하므로 **JS 변경 0**. 배열 append 시 기존 값 보존(ShareExtension이 동시에 쓸 수 있음).

**Step 1: Swift 코드**

```swift
import Foundation
import AppIntents

/**
 * Shortcuts 캡처 — 텍스트를 공유 확장과 같은 App Group 수용 레코드에 써서
 * 앱 기동/포그라운드 시 기존 흡수 파이프라인(processPendingBatch)으로 저장한다.
 * 앱이 죽어 있어도 백그라운드 실행되므로 "잠금화면→3초 캡처"가 된다.
 */
@available(iOS 16.0, *)
struct CaptureQuickNoteIntent: AppIntent {
    static var title: LocalizedStringResource = "빠른 노트 캡처"
    static var description = IntentDescription("텍스트를 Glimpse 지식 라이브러리에 빠르게 저장합니다.")

    @Parameter(title: "노트", inputOptions: StringIntentOptions.default)
    var text: String

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let defaults = UserDefaults(suiteName: AppGroupModule.appGroupIdentifier) else {
            return .result()
        }
        let key = AppGroupModule.sharedKey
        var existing = defaults.stringArray(forKey: key) ?? []
        existing.append(text)
        defaults.set(existing, forKey: key)
        defaults.set(true, forKey: "\(key)_directSave")
        defaults.synchronize()
        return .result()
    }
}

@available(iOS 16.0, *)
struct GlimpseShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: CaptureQuickNoteIntent(),
            phrases: [
                "\(.applicationName)에 노트 저장",
                "Quick capture in \(.applicationName)",
            ],
            shortTitle: "노트 캡처",
            systemImageName: "square.and.pencil"
        )
    }
}
```

**Step 2:** pbxproj에 소스 파일 참조 추가(`AppGroupModule.swift`가 등록된 4개 섹션과 동일 위치: PBXBuildFile, PBXFileReference, PBXSourcesBuildPhase, PBXGroup).
**Step 3: 빌드 확인** — `bun run ios`(시뮬레이터) 빌드가 App Intent 컴파일을 통과하는지. App Intents 메타데이터 추출은 Xcode 빌드 단계에서 자동.

### Task 11: 흡수 스모크 + type 필드 확인

- 기존 흡수 파이프라인은 `type:'share'`로 저장하므로 인텐트 캡처도 동일하게 분류된다(설계 수용 — 별도 type 확장은 YAGNI).
- **수동 E2E:** 시뮬레이터/실기기 Shortcuts 앱 → "빠른 노트 캡처" 실행 → 앱 실행 → 라이브러리 도착 확인. 앱 켜진 상태 인텐트 실행 → 다음 foreground에 흡수 확인.
- 단위 테스트는 Task 2에서 검증된 `process-pending-batch` 기존 테스트 자산으로 충분 — 새 테스트 없음(레코드 형식 무변경이므로).

### Task 12: C3 게이트

- `bun run lint` + 모바일 typecheck + 시뮬레이터 스모크 기록.
- A1의 공유 시트 E2E와 함께 GUI 체크리스트로 남긴다.

---

## 전체 게이트 체크리스트 (세션 종료 전)

- [ ] `bun test` (모바일 전체) + `bun test apps/desktop` 단위 — 회귀 0
- [ ] `bun run lint`
- [ ] 데스크톱 typecheck
- [ ] GUI: 채팅 참조 칩 / digest 최근 연결 / (A1 후) Shortcuts 흡수
- [ ] 모든 커밋이 명시적 파일 지정으로 남의 파일 미포함 확인 (`git show --stat`)
