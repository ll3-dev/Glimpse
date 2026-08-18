> ⚠️ **역사 문서** — Nitro/cbindgen 아키텍처(2026-03) 기준으로 작성됨.
> 2026-08 rustra 통합으로 무효된 내용을 포함한다. 현재 아키텍처는
> `docs/plans/2026-08-16-rustra-integration-design.md` 참조.

# Tauri Desktop Feature Parity 구현 계획

## 개요

모바일 앱과 동등한 기능을 Tauri 데스크톱 앱에 구현. 사이드바 + 패널 기반 UI, TanStack Router, shadcn/ui, llama.cpp Rust 통합을 포함한 전체 기능 동시 구현.

## 현재 상태 분석

### 데스크톱 구현 현황
```
✅ Rust 백엔드: 27개 Tauri commands 완전 구현
✅ CoreClient: desktop-core-client.ts 완전 구현
✅ Shared Types: @glimpse/shared 로 공유
❌ UI 화면: DesktopShell (LLM 런타임 상태) 1개뿐
❌ Feature Hooks: useDesktopLLMOverview 1개뿐
❌ 라우팅: 없음
❌ AI Provider: Mock 상태
❌ Labeling: 없음
```

### 모바일 대비 누락 기능
| 기능 | 모바일 | 데스크톱 | 격차 |
|------|--------|----------|------|
| Library (목록/검색/상세) | 완전 | 없음 | 전체 화면 |
| Chat (대화/AI 응답) | 완전 | 없음 | 전체 화면 + AI |
| Review (간격반복) | 완전 | 없음 | 전체 화면 |
| Digest (추천) | 완전 | 없음 | 전체 화면 |
| Capture (저장) | 완전 | 없음 | 폼 + 로직 |
| Settings (설정) | 완전 | 없음 | 설정 화면 |
| AI Providers | Apple/BYOK/Local | Mock | 실제 구현 |
| Labeling | FG+BG | 없음 | 전체 |
| Search | 클라이언트 검색 | 없음 | 전체 |

## 아키텍처

### 라우팅: TanStack Router

```
apps/desktop/src/app/
├── __root.tsx              # Root layout
├── _authenticated/         # 인증 레이아웃 그룹
│   ├── _authenticated.tsx  # Sidebar + panel shell
│   ├── library/
│   │   ├── index.tsx       # 아이템 목록
│   │   └── $itemId.tsx     # 아이템 상세 (secondary panel)
│   ├── chat/
│   │   ├── index.tsx       # 대화 목록
│   │   └── $conversationId.tsx  # 채팅 화면
│   ├── review.tsx          # 간격 반복
│   ├── digest.tsx          # 추천
│   └── settings.tsx        # 설정
├── capture.tsx             # 캡처 모달 오버레이
└── index.tsx               # → /library 리다이렉트
```

### 레이아웃: 사이드바 + 패널

```
┌──────────┬────────────────────────────────────┐
│ Sidebar  │  Main Panel                        │
│ 240px    │  flex-1                            │
│          │                                    │
│ Library  │  ┌─────────────┬────────────────┐ │
│ Chat     │  │ Primary     │ Secondary      │ │
│ Review   │  │ Panel       │ Panel (opt)    │ │
│ Digest   │  │             │               │ │
│ Settings │  │             │               │ │
│          │  └─────────────┴────────────────┘ │
│ [+ New]  │                                    │
└──────────┴────────────────────────────────────┘
```

- Secondary panel: Library 상세, Chat 대화에서 열림
- Capture: 모달 오버레이

### 공유 코드 승격

Feature 함수와 TanStack Query hooks를 packages/로 승격:

```
packages/
├── shared/      # 기존: 타입, 인터페이스
├── features/    # 신규: 비즈니스 로직 (DI 패턴)
├── hooks/       # 신규: TanStack Query hooks
├── ui/          # 기존: 모바일 UI 프리미티브
└── core-rust/   # 기존: Rust 코어
```

**DI 패턴 유지** (모바일에서 이미 사용 중):
```typescript
// packages/features/library/getAllKnowledgeItems.ts
export function createGetAllKnowledgeItems(deps: { coreClient: CoreClient }) {
  return async () => deps.coreClient.listKnowledgeItems();
}
// Mobile: mobileCoreClient 주입
// Desktop: desktopCoreClient 주입
```

### UI 전략

- **공유 프리미티브**: `@glimpse/ui` (Button, Text, Badge 등 RN-web 공통)
- **데스크톱 전용**: shadcn/ui + Tailwind (사이드바, 패널, 테이블 등)
- **데스크톱 전용 컴포넌트**: `apps/desktop/src/components/ui/`

### 상태 관리

- **TanStack Query**: 서버 상태 (지식 항목, 대화 등)
- **Zustand**: 클라이언트 상태 (설정, UI 상태)

## 구현 단계

### Phase 1 — 인프라 (순차, 1 에이전트)

1. TanStack Router 설정 + 라우트 스캐폴드
2. Tailwind CSS + shadcn/ui 초기화
3. `packages/features/` — 모바일에서 feature 함수 승격
4. `packages/hooks/` — TanStack Query hooks 승격
5. 사이드바 + 패널 레이아웃 컴포넌트
6. QueryClient 프로바이더 설정

### Phase 2 — UI 피처 (병렬, 5 에이전트)

| 에이전트 | 담당 | 의존성 |
|---------|------|--------|
| A | Library (목록 + 검색 + 상세) | Phase 1 |
| B | Chat (대화 목록 + AI 생성) | Phase 1 |
| C | Review + Digest | Phase 1 |
| D | Capture + Settings | Phase 1 |
| E | llama.cpp Rust 통합 | Phase 1 (독립) |

### Phase 3 — 통합 (1 에이전트)

- 라우트 연결 및 전체 테스트
- 크로스 패널 네비게이션
- 에러 바운더리 설정
- 일관성 검증

## 핵심 결정사항

1. **TanStack Router** — SPA에 최적화된 타입 안전 라우팅
2. **shadcn/ui + Tailwind** — 순수 웹, RN-web 오버헤드 없음
3. **DI 패턴 유지** — features는 CoreClient 인터페이스에만 의존
4. **llama.cpp Rust 직접 통합** — Tauri Rust 사이드에서 네이티브 실행
5. **패키지 승격** — features와 hooks를 공유 패키지로 추출
