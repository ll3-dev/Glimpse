# Effect.js 전면 마이그레이션 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 전체 코드베이스를 Effect.js 패턴으로 통일 (에러 처리, 비동기 코드, 의존성 주입)

**Architecture:**
1. 인프라 확장 - effect-result.ts에 Context, Layer, 의존성 주입 헬퍼 추가
2. AI 레이어 - providers, executors를 Effect.gen + tryPromise로 변경
3. Hooks - React Query와 호환되는 Effect 실행 패턴으로 변경
4. Features - Result<T> 대신 Effect<E, A, R> 반환

**Tech Stack:** Effect.js v3.19.17, React Native, Expo, TypeScript

---

## Task 1: 인프라 확장

**Files:**
- Modify: `apps/mobile/src/lib/effect-result.ts`

**Step 1: Context 및 Layer 헬퍼 추가**

```typescript
import { Context, Effect, Layer } from 'effect';

// 서비스용 Context 태그 생성
export const Database = Context.GenericTag<Database>();
export const AiService = Context.GenericTag<AiService>();
export const Logger = Context.GenericTag<Logger>();

// Layer 정의 (나중에 구현체와 연결)
export const DatabaseLive = Layer.succeed(Database)({});
export const AiServiceLive = Layer.succeed(AiService)({});
export const LoggerLive = Layer.succeed(Logger)({});
```

**Step 2: 의존성 주입이 포함된 Effect 실행 헬퍼 추가**

```typescript
// 기존 runEffectResult를 Layer와 함께 사용할 수 있도 확장
export async function runEffectWithLayer<T, R, E, A>(
  effect: Effect.Effect<A, E, R>,
  layer: Layer.Layer<R>
): Promise<Result<A>> {
  const runtime = await Effect.runPromise(Effect.provide(layer)(effect));
  // ... Result 변환 로직
}
```

**Step 3: 테스트 작성**

Create: `apps/mobile/src/lib/effect-result.test.ts`

```typescript
import { describe, it } from 'bun:test';
import { Database, DatabaseLive, runEffectWithLayer } from './effect-result';

describe('Effect Layer Helpers', () => {
  it('should run effect with layer', async () => {
    const effect = Effect.gen(function* (_) {
      const db = yield* _(Database);
      return yield* _(db.query('SELECT 1'));
    });

    const result = await runEffectWithLayer(effect, DatabaseLive);
    // assertions...
  });
});
```

**Step 4: 테스트 실행**

Run: `bun test apps/mobile/src/lib/effect-result.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add apps/mobile/src/lib/effect-result.ts apps/mobile/src/lib/effect-result.test.ts
git commit -m "feat(effect): add Context and Layer helpers for DI"
```

---

## Task 2: Apple Provider 마이그레이션

**Files:**
- Modify: `apps/mobile/src/features/ai/providers/apple-provider.ts`
- Test: `apps/mobile/src/features/ai/providers/apple-provider.test.ts`

**Step 1: 테스트 수정 (Effect 패턴으로 변경)**

```typescript
// apple-provider.test.ts에 Effect 패턴 테스트 추가
import { Effect } from 'effect';

it('should return Effect from generate', async () => {
  const provider = createAppleProvider({ ... });
  const effect = provider.generateEffect(input); // 새로운 Effect 반환 메서드

  const result = await Effect.runPromiseExit(effect);
  expect(Exit.isSuccess(result)).toBe(true);
});
```

**Step 2: 구현체에 Effect 메서드 추가**

```typescript
// apple-provider.ts
import { Effect } from 'effect';

export interface MetadataProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generate(input: MetadataInput): Promise<Result<MetadataOutput>>; // 기존
  generateEffect(input: MetadataInput): Effect.Effect<MetadataOutput, AppError, AiService>; // 새로운
}
```

**Step 3: 구현**

```typescript
// apple-provider.ts의 createAppleProvider 함수 내부
generateEffect(input: MetadataInput): Effect.Effect<MetadataOutput, AppError, AppleBridge> {
  return Effect.gen(function* (_) {
    // toggle 확인
    if (!isToggleEnabled()) {
      return yield* _(Effect.fail(aiProviderError(...)));
    }

    // native availability 확인
    const availability = yield* _(Effect.tryPromise({
      try: () => bridge.isAvailable(),
      catch: (e) => aiProviderError(...)
    }));

    if (!availability.available) {
      return yield* _(Effect.fail(aiProviderError(...)));
    }

    // summary 생성
    const summaryPrompt = buildSummaryPrompt(input);
    const summaryResult = yield* _(Effect.tryPromise({
      try: () => bridge.generate(summaryPrompt, { maxTokens: 128, temperature: 0.3 }),
      catch: (e) => aiProviderError(...)
    }));

    // tags 생성
    const tagsPrompt = buildTagsPrompt(input);
    const tagsResult = yield* _(Effect.tryPromise({
      try: () => bridge.generate(tagsPrompt, { maxTokens: 64, temperature: 0.3 }),
      catch: (e) => aiProviderError(...)
    }));

    return {
      summary: summaryResult.text.trim(),
      tags: parseTagsResponse(tagsResult.text),
    };
  });
}
```

**Step 4: 테스트 실행**

Run: `bun test apps/mobile/src/features/ai/providers/apple-provider.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add apps/mobile/src/features/ai/providers/apple-provider.ts apps/mobile/src/features/ai/providers/apple-provider.test.ts
git commit -m "feat(ai): migrate apple-provider to Effect pattern"
```

---

## Task 3: Local LLM Provider 마이그레이션

**Files:**
- Modify: `apps/mobile/src/features/ai/providers/local-llm-provider.ts`
- Test: `apps/mobile/src/features/ai/providers/local-llm-provider.test.ts`

**Step 1-5:** Apple Provider와 동일한 패턴으로 진행

---

## Task 4: BYOK Provider 마이그레이션

**Files:**
- Modify: `apps/mobile/src/features/ai/providers/byok-provider.ts`
- Test: `apps/mobile/src/features/ai/providers/byok-provider.test.ts`

**Step 1-5:** Apple Provider와 동일한 패턴으로 진행

---

## Task 5: AI Executors 마이그레이션

**Files:**
- Modify: `apps/mobile/src/features/ai/targets/executors.ts`

**Step 1: executeLabelingTarget를 Effect로 변경**

```typescript
// executors.ts
export const executeLabelingTargetEffect = (
  target: AITarget,
  item: KnowledgeItem
): Effect.Effect<LabelingResult, AppError, AiService | Database> =>
  Effect.gen(function* (_) {
    const selectedTarget = yield* _(selectTarget(target));
    const provider = yield* _(getProviderForTarget(selectedTarget));
    // ... 로직
  });
```

**Step 2: 테스트 작성**

**Step 3: 테스트 실행**

**Step 4: 커밋**

---

## Task 6: Chat Hooks 마이그레이션

**Files:**
- Modify: `apps/mobile/src/hooks/chat/useChat.ts`
- Modify: `apps/mobile/src/hooks/chat/chatGeneration.ts`

**Step 1: chatGeneration.ts를 Effect로 변경**

```typescript
// chatGeneration.ts
export const generateAssistantReplyEffect = (
  messages: ChatMessage[],
  config: GenerationConfig
): Effect.Effect<string, AppError, AiService> =>
  Effect.gen(function* (_) {
    // ... 로직
  });
```

**Step 2: useChat.ts에서 Effect 실행**

**Step 3: 테스트**

**Step 4: 커밋**

---

## Task 7: getAllKnowledgeItems 마이그레이션

**Files:**
- Modify: `apps/mobile/src/features/library/getAllKnowledgeItems.ts`

**Step 1-4:** 동일한 패턴으로 진행

---

## Task 8: local-llm.sync 마이그레이션

**Files:**
- Modify: `apps/mobile/src/features/settings/local-llm.sync.ts`

**Step 1-4:** 동일한 패턴으로 진행

---

## Task 9: 통합 테스트 및 린트

**Step 1: 전체 테스트 실행**

Run: `bun test`
Expected: PASS

**Step 2: 린트 실행**

Run: `bun run lint`
Expected: PASS

**Step 3: 타입체크**

Run: `bun run typecheck`
Expected: PASS

**Step 4: 커밋**

```bash
git add .
git commit -m "feat: complete Effect.js migration"
```
