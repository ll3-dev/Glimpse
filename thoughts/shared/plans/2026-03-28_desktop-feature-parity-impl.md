# Desktop Feature Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 모바일 앱과 동등한 기능을 Tauri 데스크톱에 구현 — 사이드바+패널 UI, 전체 CRUD 화면, llama.cpp Rust 통합.

**Architecture:** Hybrid 접근 — Phase 1에서 인프라(라우터, 공유 패키지, 레이아웃)를 순차 구축 후, Phase 2에서 5개 병렬 에이전트가 각 피처 UI를 독립 구현. 마지막 Phase 3에서 통합.

**Tech Stack:** TanStack Router, shadcn/ui + Tailwind CSS, TanStack Query, Zustand, Effect, llama.cpp (Rust), Tauri 2.0

**Design Doc:** `thoughts/shared/plans/2026-03-28_desktop-feature-parity.md`

---

## Phase 1: Infrastructure (Sequential — 1 Agent)

### Task 1: TanStack Router + Tailwind + shadcn/ui 초기 설정

**Files:**
- Modify: `apps/desktop/package.json`
- Create: `apps/desktop/tailwind.config.ts`
- Create: `apps/desktop/postcss.config.js`
- Create: `apps/desktop/src/app/__root.tsx`
- Create: `apps/desktop/src/app/index.tsx`
- Create: `apps/desktop/src/routeTree.gen.ts` (auto-generated)
- Modify: `apps/desktop/vite.config.ts`
- Modify: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/src/styles/globals.css`

**Step 1: 의존성 설치**

```bash
cd apps/desktop
bun add @tanstack/react-router @tanstack/router-vite-plugin @tanstack/router-devtools
bun add tailwindcss @tailwindcss/vite
bun add -D @tanstack/router-cli
```

**Step 2: Tailwind 설정**

`apps/desktop/vite.config.ts`에 `@tailwindcss/vite` 플러그인 추가:
```ts
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ... 기존 alias 유지
});
```

`apps/desktop/src/styles/globals.css` 생성:
```css
@import "tailwindcss";
```

**Step 3: TanStack Router 설정**

`apps/desktop/vite.config.ts`에 라우터 플러그인 추가:
```ts
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';

export default defineConfig({
  plugins: [react(), tailwindcss(), TanStackRouterVite()],
  // ...
});
```

`apps/desktop/src/app/__root.tsx` 생성:
```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';
import '../styles/globals.css';

export const Route = createRootRoute({
  component: () => <Outlet />,
});
```

`apps/desktop/src/app/index.tsx` 생성:
```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => { throw redirect({ to: '/library' }); },
});
```

**Step 4: main.tsx를 TanStack Router에 연결**

```tsx
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });
declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

createRoot(rootElement).render(<RouterProvider router={router} />);
```

**Step 5: 라우트 스캐폴드 생성 (빈 화면)**

```
apps/desktop/src/app/
├── __root.tsx
├── _authenticated/
│   ├── _authenticated.tsx     # 사이드바 레이아웃
│   ├── library/index.tsx
│   ├── library/$itemId.tsx
│   ├── chat/index.tsx
│   ├── chat/$conversationId.tsx
│   ├── review.tsx
│   ├── digest.tsx
│   └── settings.tsx
├── capture.tsx                # 모달
└── index.tsx                  # 리다이렉트
```

각 파일은 최소한의 `createFileRoute`만 포함:
```tsx
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_authenticated/library/')({
  component: () => <div>Library</div>,
});
```

**Step 6: tsconfig에 path alias 추가**

```json
{
  "paths": {
    "@/*": ["./src/*"],
    // 기존 @glimpse/* 유지
  }
}
```

**Step 7: 라우트 파일 생성 후 dev 서버로 동작 확인**

```bash
bun run dev
```
Expected: 빈 화면들이 `/library`, `/chat` 등에서 렌더링

**Step 8: shadcn/ui 초기화**

```bash
bunx shadcn@latest init
```
- Style: Default
- Base color: Slate
- CSS variables: yes

**Step 9: Commit**

```bash
git add apps/desktop/
git commit -m "feat(desktop): add TanStack Router, Tailwind, shadcn/ui scaffold"
```

---

### Task 2: 공유 packages/features/ + packages/hooks/ 생성

**Files:**
- Create: `packages/features/package.json`
- Create: `packages/features/tsconfig.json`
- Create: `packages/features/src/index.ts`
- Create: `packages/features/src/library/` (mobile에서 복사)
- Create: `packages/features/src/chat/` (mobile에서 복사)
- Create: `packages/features/src/review/` (mobile에서 복사)
- Create: `packages/features/src/recommendation/` (mobile에서 복사)
- Create: `packages/features/src/capture/` (mobile에서 복사)
- Create: `packages/features/src/search/` (mobile에서 복사)
- Create: `packages/hooks/package.json`
- Create: `packages/hooks/tsconfig.json`
- Create: `packages/hooks/src/index.ts`
- Create: `packages/hooks/src/queries/` (mobile에서 복사)
- Create: `packages/hooks/src/mutations/` (mobile에서 복사)
- Create: `packages/hooks/src/query-keys.ts`
- Modify: `package.json` (workspace에 packages/features, packages/hooks 추가)
- Modify: `apps/desktop/package.json` (dependency 추가)
- Modify: `apps/mobile/package.json` (dependency 추가)
- Modify: `apps/desktop/vite.config.ts` (alias 추가)
- Modify: `apps/desktop/tsconfig.json` (paths 추가)

**Step 1: packages/features/ 구조 생성**

```bash
mkdir -p packages/features/src/{library,chat,review,recommendation,capture,search}
```

`packages/features/package.json`:
```json
{
  "name": "@glimpse/features",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "@glimpse/shared": "workspace:*",
    "effect": "^3.19.0"
  }
}
```

**Step 2: 모바일 feature 함수를 packages/features/로 복사 + DI 정리**

핵심 원칙: **CoreClient 직접 import 제거, deps 파라미터로만 접근**

`packages/features/src/library/getAllKnowledgeItems.ts`:
```ts
// 모바일에서 복사하되, mobileCoreClient 기본 주입 제거
import type { KnowledgeItem } from '@glimpse/shared';

export interface GetAllKnowledgeItemsDeps {
  coreClient: { listKnowledgeItems: () => Promise<KnowledgeItem[]> };
}

export type GetItemsResult =
  | { success: true; items: KnowledgeItem[] }
  | { success: false; error: Error };

export function createGetAllKnowledgeItems(deps: GetAllKnowledgeItemsDeps) {
  return async (): Promise<GetItemsResult> => {
    try {
      const items = await deps.coreClient.listKnowledgeItems();
      return { success: true, items };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  };
}
```

**동일 패턴으로 복사할 파일들:**

| Mobile Path | Package Path | 비고 |
|---|---|---|
| `features/library/getAllKnowledgeItems.ts` | `features/src/library/getAllKnowledgeItems.ts` | DI만 |
| `features/library/resolveLibrarySearch.ts` | `features/src/library/resolveLibrarySearch.ts` | 순수 함수 |
| `features/library/getLibraryEmptyState.ts` | `features/src/library/getLibraryEmptyState.ts` | 순수 함수 |
| `features/chat/getAllConversations.ts` | `features/src/chat/getAllConversations.ts` | DI |
| `features/chat/getConversationMessages.ts` | `features/src/chat/getConversationMessages.ts` | DI |
| `features/chat/createConversation.ts` | `features/src/chat/createConversation.ts` | DI |
| `features/chat/addMessage.ts` | `features/src/chat/addMessage.ts` | DI |
| `features/chat/updateMessage.ts` | `features/src/chat/updateMessage.ts` | DI |
| `features/chat/deleteMessage.ts` | `features/src/chat/deleteMessage.ts` | DI |
| `features/chat/deleteConversation.ts` | `features/src/chat/deleteConversation.ts` | DI |
| `features/chat/updateConversationTitle.ts` | `features/src/chat/updateConversationTitle.ts` | DI |
| `features/chat/updateConversationDetails.ts` | `features/src/chat/updateConversationDetails.ts` | DI |
| `features/chat/chatMessageContent.ts` | `features/src/chat/chatMessageContent.ts` | 순수 함수 |
| `features/review/getDueItems.ts` | `features/src/review/getDueItems.ts` | DI |
| `features/review/reviewActions.ts` | `features/src/review/reviewActions.ts` | DI |
| `features/review/reviewActions.markAsReviewed.ts` | `features/src/review/reviewActions.markAsReviewed.ts` | DI |
| `features/review/reviewActions.postpone.ts` | `features/src/review/reviewActions.postpone.ts` | DI |
| `features/review/reviewActions.shared.ts` | `features/src/review/reviewActions.shared.ts` | DI |
| `features/review/adjustIntervalFromFeedback.ts` | `features/src/review/adjustIntervalFromFeedback.ts` | 순수 함수 |
| `features/review/initializeReviewSchedule.ts` | `features/src/review/initializeReviewSchedule.ts` | DI |
| `features/recommendation/getPendingRecommendations.ts` | `features/src/recommendation/getPendingRecommendations.ts` | DI |
| `features/recommendation/respondToRecommendation.ts` | `features/src/recommendation/respondToRecommendation.ts` | DI |
| `features/recommendation/logRecommendationFeedback.ts` | `features/src/recommendation/logRecommendationFeedback.ts` | DI |
| `features/recommendation/getWeeklyItems.ts` | `features/src/recommendation/getWeeklyItems.ts` | DI |
| `features/recommendation/generateRecommendations.usecase.ts` | `features/src/recommendation/generateRecommendations.usecase.ts` | DI |
| `features/recommendation/saveRecommendations.usecase.ts` | `features/src/recommendation/saveRecommendations.usecase.ts` | DI |
| `features/recommendation/recommendationSimilarity.ts` | `features/src/recommendation/recommendationSimilarity.ts` | 순수 함수 |
| `features/capture/saveKnowledgeItem.ts` | `features/src/capture/saveKnowledgeItem.ts` | DI |
| `features/capture/saveKnowledgeItem.validation.ts` | `features/src/capture/saveKnowledgeItem.validation.ts` | 순수 함수 |
| `features/capture/saveKnowledgeItem.transform.ts` | `features/src/capture/saveKnowledgeItem.transform.ts` | 순수 함수 |
| `features/capture/form/reducer.ts` | `features/src/capture/form/reducer.ts` | 순수 함수 |
| `features/capture/form/buildSaveInput.ts` | `features/src/capture/form/buildSaveInput.ts` | 순수 함수 |
| `features/capture/form/types.ts` | `features/src/capture/form/types.ts` | 타입 |
| `features/search/filterKnowledgeItems.ts` | `features/src/search/filterKnowledgeItems.ts` | 순수 함수 |
| `features/search/parseQueryToKeyword.ts` | `features/src/search/parseQueryToKeyword.ts` | 순수 함수 |

**Step 3: packages/hooks/ 구조 생성**

```bash
mkdir -p packages/hooks/src/{queries,mutations}
```

`packages/hooks/package.json`:
```json
{
  "name": "@glimpse/hooks",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "dependencies": {
    "@glimpse/shared": "workspace:*",
    "@glimpse/features": "workspace:*",
    "@tanstack/react-query": "^5.83.0"
  }
}
```

**Step 4: query-keys.ts + hooks 복사**

`packages/hooks/src/query-keys.ts`: 모바일의 `lib/query-keys.ts`를 그대로 복사

**Hook 복사 대상:**

| Mobile Path | Package Path |
|---|---|
| `hooks/queries/useKnowledgeItems.ts` | `hooks/src/queries/useKnowledgeItems.ts` |
| `hooks/queries/useChat.ts` | `hooks/src/queries/useChat.ts` |
| `hooks/queries/useMessages.ts` | `hooks/src/queries/useMessages.ts` |
| `hooks/queries/useDueItems.ts` | `hooks/src/queries/useDueItems.ts` |
| `hooks/queries/useRecommendations.ts` | `hooks/src/queries/useRecommendations.ts` |
| `hooks/mutations/useCaptureActions.ts` | `hooks/src/mutations/useCaptureActions.ts` |
| `hooks/mutations/useChatMutations.ts` | `hooks/src/mutations/useChatMutations.ts` |
| `hooks/mutations/useReviewActions.ts` | `hooks/src/mutations/useReviewActions.ts` |
| `hooks/mutations/useRecommendationActions.ts` | `hooks/src/mutations/useRecommendationActions.ts` |

**중요**: hooks의 import 경로를 `@/src/features/` → `@glimpse/features`로 변경

**Step 5: 모바일을 packages/hooks 사용하도록 마이그레이션**

`apps/mobile/src/hooks/`의 각 파일이 `@glimpse/hooks`에서 re-export하도록 변경:
```ts
// apps/mobile/src/hooks/queries/useKnowledgeItems.ts
export { useKnowledgeItemsQuery } from '@glimpse/hooks';
```

**Step 6: 루트 package.json workspace + tsconfig paths 업데이트**

`package.json`:
```json
{ "workspaces": ["apps/*", "packages/*"] }
```

`apps/desktop/vite.config.ts`에 alias 추가:
```ts
{ find: '@glimpse/features', replacement: path.resolve(__dirname, '../../packages/features/src/index.ts') },
{ find: '@glimpse/hooks', replacement: path.resolve(__dirname, '../../packages/hooks/src/index.ts') },
```

**Step 7: 타입 체크 + 테스트**

```bash
cd apps/desktop && bun run typecheck
cd ../mobile && bun test
```

**Step 8: Commit**

```bash
git add packages/features packages/hooks apps/mobile/src/hooks apps/desktop/
git commit -m "feat: extract features and hooks into shared packages"
```

---

### Task 3: 사이드바 + 패널 레이아웃

**Files:**
- Create: `apps/desktop/src/components/layout/AppSidebar.tsx`
- Create: `apps/desktop/src/components/layout/MainPanel.tsx`
- Create: `apps/desktop/src/components/layout/SplitPanel.tsx`
- Create: `apps/desktop/src/components/layout/AppShell.tsx`
- Modify: `apps/desktop/src/app/_authenticated/_authenticated.tsx`
- Create: `apps/desktop/src/lib/core-client.ts` (desktop CoreClient 싱글톤)
- Create: `apps/desktop/src/lib/query-client.ts` (QueryClient 프로바이더)

**Step 1: CoreClient 싱글톤 + QueryClient 설정**

`apps/desktop/src/lib/core-client.ts`:
```ts
import { createDesktopCoreClient } from '@/features/core/desktop-core-client';
import type { CoreClient } from '@glimpse/shared';

export const desktopCoreClient: CoreClient = createDesktopCoreClient();
```

`apps/desktop/src/lib/query-client.ts`:
```ts
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
});
```

**Step 2: shadcn/ui 컴포넌트 설치**

```bash
bunx shadcn@latest add button input scroll-area separator tooltip badge
```

**Step 3: AppSidebar 컴포넌트**

`apps/desktop/src/components/layout/AppSidebar.tsx`:
- TanStack Router의 `Link` + `useRouterState`로 활성 탭 표시
- 네비게이션 항목: Library, Chat, Review, Digest, Settings
- 하단에 [+ New] 캡처 버튼 → `/capture` 모달

**Step 4: MainPanel + SplitPanel**

`apps/desktop/src/components/layout/MainPanel.tsx`:
- `<Outlet />` 감싸는 메인 영역

`apps/desktop/src/components/layout/SplitPanel.tsx`:
- Primary + Secondary 분할 (resizable)
- Secondary는 선택적 (상세 뷰에서 열림)

**Step 5: AppShell**

`apps/desktop/src/components/layout/AppShell.tsx`:
- AppSidebar + MainPanel 조합
- QueryClientProvider 래핑

**Step 6: _authenticated.tsx 레이아웃 연결**

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';

export const Route = createFileRoute('/_authenticated')({
  component: () => <AppShell><Outlet /></AppShell>,
});
```

**Step 7: 동작 확인**

```bash
bun run dev
```
Expected: 사이드바가 보이고, 탭 클릭 시 각 화면 전환

**Step 8: Commit**

```bash
git add apps/desktop/src/components/layout apps/desktop/src/lib apps/desktop/src/app/
git commit -m "feat(desktop): add sidebar + panel layout with navigation"
```

---

### Task 4: 데스크톱 Feature 초기화 (CoreClient 주입)

**Files:**
- Create: `apps/desktop/src/lib/desktop-features.ts`
- Create: `apps/desktop/src/lib/desktop-hooks.ts`

**Step 1: Feature 함수에 desktopCoreClient 주입**

`apps/desktop/src/lib/desktop-features.ts`:
```ts
import { desktopCoreClient } from './core-client';
import { createGetAllKnowledgeItems } from '@glimpse/features/library';

export const getAllKnowledgeItems = createGetAllKnowledgeItems({
  coreClient: desktopCoreClient,
});
// 동일 패턴으로 모든 feature 함수 주입
```

**Step 2: Commit**

```bash
git commit -m "feat(desktop): wire desktop CoreClient into shared features"
```

---

## Phase 2: Feature UI (Parallel — 5 Agents)

### Task 5 (Agent A): Library — 목록 + 검색 + 상세

**Files:**
- Modify: `apps/desktop/src/app/_authenticated/library/index.tsx`
- Modify: `apps/desktop/src/app/_authenticated/library/$itemId.tsx`
- Create: `apps/desktop/src/components/library/KnowledgeItemList.tsx`
- Create: `apps/desktop/src/components/library/KnowledgeItemCard.tsx`
- Create: `apps/desktop/src/components/library/KnowledgeItemDetail.tsx`
- Create: `apps/desktop/src/components/library/SearchBar.tsx`

**Step 1: 라우트 설정**

`library/index.tsx`: 아이템 목록 + 검색바
`library/$itemId.tsx`: 상세 패널 (SplitPanel의 secondary)

**Step 2: KnowledgeItemList 컴포넌트**

- `useKnowledgeItemsQuery()` from `@glimpse/hooks`
- `filterKnowledgeItems()` from `@glimpse/features/search`
- Flash-list 대신 가상 스크롤 또는 일반 리스트 (웹)
- 카드 클릭 시 `/library/$itemId`로 네비게이션

**Step 3: SearchBar 컴포넌트**

- `parseQueryToKeyword()` from `@glimpse/features/search`
- 실시간 필터링 (debounce)

**Step 4: KnowledgeItemDetail 컴포넌트**

- `useQuery`로 개별 아이템 조회
- 태그, 라벨, 리뷰 상태 표시
- 메타데이터 (생성일, 타입, 출처)

**Step 5: SplitPanel 통합**

Library에서 아이템 선택 시 SplitPanel 열림:
- Primary: 목록 유지
- Secondary: 상세

**Step 6: Commit**

```bash
git commit -m "feat(desktop): implement Library screen with search and detail panel"
```

---

### Task 6 (Agent B): Chat — 대화 목록 + AI 생성

**Files:**
- Modify: `apps/desktop/src/app/_authenticated/chat/index.tsx`
- Modify: `apps/desktop/src/app/_authenticated/chat/$conversationId.tsx`
- Create: `apps/desktop/src/components/chat/ConversationList.tsx`
- Create: `apps/desktop/src/components/chat/ChatView.tsx`
- Create: `apps/desktop/src/components/chat/MessageBubble.tsx`
- Create: `apps/desktop/src/components/chat/ChatInput.tsx`
- Create: `apps/desktop/src/features/ai/desktop-ai-provider.ts`

**Step 1: 라우트 설정**

`chat/index.tsx`: 대화 목록
`chat/$conversationId.tsx`: 채팅 화면 (전체 panel)

**Step 2: ConversationList 컴포넌트**

- `useConversationsQuery()` from `@glimpse/hooks`
- 새 대화 생성 버튼 → `createConversation`
- 대화 클릭 시 `/$conversationId` 이동

**Step 3: ChatView 컴포넌트**

- `useMessagesQuery()` from `@glimpse/hooks`
- 메시지 리스트 (user/assistant 구분)
- `useChatMutations` for add/update/delete message

**Step 4: ChatInput 컴포넌트**

- 텍스트 입력 + 전송 버튼
- Enter로 전송, Shift+Enter로 줄바꿈

**Step 5: AI 응답 생성 (초기: BYOK 또는 stub)**

`desktop-ai-provider.ts`:
- Phase 2에서는 BYOK (OpenAI 호환) 먼저 구현
- Phase 2 Agent E의 llama.cpp 완료 후 전환 가능

**Step 6: Commit**

```bash
git commit -m "feat(desktop): implement Chat screen with AI response generation"
```

---

### Task 7 (Agent C): Review + Digest

**Files:**
- Modify: `apps/desktop/src/app/_authenticated/review.tsx`
- Modify: `apps/desktop/src/app/_authenticated/digest.tsx`
- Create: `apps/desktop/src/components/review/ReviewCard.tsx`
- Create: `apps/desktop/src/components/review/ReviewDeck.tsx`
- Create: `apps/desktop/src/components/digest/DigestCard.tsx`
- Create: `apps/desktop/src/components/digest/DigestList.tsx`

**Step 1: Review 화면**

- `useDueItemsQuery()` from `@glimpse/hooks`
- 카드 형태의 리뷰 아이템
- "Remembered" / "Postponed" 액션 → `useReviewActionsMutation`
- 다음 카드로 스와이프/전환

**Step 2: Digest 화면**

- `useRecommendationsQuery()` from `@glimpse/hooks`
- 추천 카드 리스트 (itemA ↔ itemB 연결)
- Accept / Ignore / Dismiss → `useRecommendationActionsMutation`
- 피드백 로깅

**Step 3: Commit**

```bash
git commit -m "feat(desktop): implement Review and Digest screens"
```

---

### Task 8 (Agent D): Capture + Settings

**Files:**
- Modify: `apps/desktop/src/app/capture.tsx`
- Modify: `apps/desktop/src/app/_authenticated/settings.tsx`
- Create: `apps/desktop/src/components/capture/CaptureForm.tsx`
- Create: `apps/desktop/src/components/capture/CaptureModal.tsx`
- Create: `apps/desktop/src/components/settings/SettingsPanel.tsx`
- Create: `apps/desktop/src/components/settings/BYOKSection.tsx`
- Create: `apps/desktop/src/components/settings/LLMSection.tsx`

**Step 1: Capture 모달**

- `/capture` 라우트 → 오버레이 모달
- `useCaptureActionsMutation()` from `@glimpse/hooks`
- 폼: type 선택 (note/link/highlight), body, tags
- `buildSaveInput` from `@glimpse/features/capture`

**Step 2: Settings 화면**

- BYOK 설정: provider, API key, base URL, model 선택
- Local LLM 설정: 모델 선택, 활성화
- AI 타겟 설정: feature별 AI provider 지정

**Step 3: Commit**

```bash
git commit -m "feat(desktop): implement Capture modal and Settings screen"
```

---

### Task 9 (Agent E): llama.cpp Rust 통합

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/src/llm/mod.rs`
- Create: `apps/desktop/src-tauri/src/llm/engine.rs`
- Create: `apps/desktop/src-tauri/src/llm/session.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Modify: `apps/desktop/src-tauri/src/commands.rs`
- Modify: `apps/desktop/src-tauri/src/state.rs`
- Modify: `apps/desktop/src-tauri/src/models.rs`

**Step 1: Cargo.toml에 llama-cpp-2 의존성 추가**

```toml
[dependencies]
llama-cpp-2 = { git = "https://github.com/utilityai/llama-cpp-rs", branch = "main" }
```

**Step 2: LLM 엔진 래퍼**

`src-tauri/src/llm/engine.rs`:
- `LlamaModel` 로딩
- `LlamaContext` 생성
- `LlamaSession` 관리 (KV cache)
- Completion 생성 (스트리밍)

**Step 3: Tauri Commands (실제 구현)**

기존 mock commands를 실제 llama.cpp 호출로 교체:
- `load_model` → `LlamaModel::load_from_file`
- `run_completion` → `session.completion` with callback
- `run_embedding` → `session.embeddings`

**Step 4: 스트리밍 응답을 위한 Tauri Events**

```rust
app.emit("llm-token", token)?; // 프론트엔드로 스트리밍 토큰 전송
```

**Step 5: 프론트엔드 리스너**

`apps/desktop/src/features/ai/llama-desktop-service.ts`:
- `listen('llm-token')`로 스트리밍 수신
- AbortController로 취소 지원

**Step 6: 테스트 (mock 모델 또는 small model)**

```bash
cd apps/desktop/src-tauri
cargo test
```

**Step 7: Commit**

```bash
git commit -m "feat(desktop): integrate llama.cpp for local LLM inference"
```

---

## Phase 3: Integration (1 Agent)

### Task 10: 라우트 통합 + 전체 테스트

**Files:**
- Modify: 모든 라우트 파일 (필요시)
- Create: `apps/desktop/src/components/ErrorBoundary.tsx`

**Step 1: 에러 바운더리 설정**

**Step 2: 크로스 패널 네비게이션 연결**
- Library → Detail (SplitPanel)
- Chat list → Chat view
- Sidebar capture 버튼 → 모달

**Step 3: 전체 동작 확인**

```bash
cd apps/desktop && bun run tauri:dev
```

**Step 4: Lint + Type check**

```bash
bun run lint
bun run typecheck
```

**Step 5: 최종 Commit**

```bash
git commit -m "feat(desktop): integrate all screens and verify feature parity"
```

---

## Agent Dispatch Summary

| Phase | Agent | Tasks | Parallel? |
|-------|-------|-------|-----------|
| 1 | Agent-0 | Tasks 1-4 | Sequential |
| 2 | Agent-A | Task 5 (Library) | Parallel |
| 2 | Agent-B | Task 6 (Chat) | Parallel |
| 2 | Agent-C | Task 7 (Review+Digest) | Parallel |
| 2 | Agent-D | Task 8 (Capture+Settings) | Parallel |
| 2 | Agent-E | Task 9 (llama.cpp) | Parallel |
| 3 | Agent-0 | Task 10 (Integration) | Sequential |

**Total: 10 tasks, ~7 agents, 3 phases**
