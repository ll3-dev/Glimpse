# Living Knowledge Graph Phase E 구현 계획

- 상태: 구현 중
- 선행 단계: Phase D 완료 (`94a45b0`)

> **For Codex:** Rust shell action과 프런트 이벤트 라우팅을 실패 테스트로 먼저 고정하고,
> OS 전역 단축키·트레이는 자동 계약과 실제 패키지 런타임 증거를 분리해 기록한다.

**Goal:** Glimpse 창이 전면에 없어도 `CmdOrCtrl+Shift+K` 또는 트레이에서 기존 캡처를
열고, 저장한 지식이 별도 그래프 생성 버튼 없이 Living Graph 증분 루프로 들어가게 한다.

**Architecture:** Tauri Rust shell이 전역 단축키와 트레이를 소유한다. 캡처·그래프 메뉴는
main window를 show/unminimize/focus한 뒤 제한된 `glimpse://shell-navigate` 이벤트만 보낸다.
프런트 앱 수명 동안 등록된 한 listener가 `capture | graph` payload를 검증해 기존 TanStack
Router 경로로 이동한다. 저장은 기존 `useSaveKnowledgeItemMutation`과 knowledge query
invalidate를 그대로 사용하며, 인증 레이아웃의 `useKnowledgeGraphAutomation`이 복귀 후
dirty 항목을 처리한다.

**Window lifecycle:** 창 닫기는 앱 종료 대신 main window를 숨긴다. 실제 종료는 트레이의
종료 메뉴와 OS 명시적 quit만 수행해 전역 캡처가 계속 동작하게 한다.

---

## Task 1: Tauri 전역 단축키·트레이 shell

**Files**

- Create: `apps/desktop/src-tauri/src/shell.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `Cargo.lock`

1. 공식 Tauri v2 global-shortcut 플러그인으로
   `CommandOrControl+Shift+K`의 `Pressed` 이벤트만 처리한다.
2. 트레이 메뉴에 Glimpse 열기, 빠른 캡처, 지식 그래프, 종료를 제공한다. 캡처·그래프
   action은 창을 복원하고 제한된 target payload를 emit한다.
3. 창 닫기를 hide로 전환하고 트레이 종료는 `app.exit(0)`으로 명시적으로 종료한다.
4. 메뉴 ID→action 매핑과 navigation target을 Rust 단위 테스트로 고정한다.

## Task 2: 프런트 shell navigation adapter

**Files**

- Create: `apps/desktop/src/features/shell/desktop-shell-navigation.ts`
- Create: `apps/desktop/src/features/shell/desktop-shell-navigation.test.ts`
- Modify: `apps/desktop/src/main.tsx`

1. `capture | graph`만 허용하고 다른 payload는 무시하는 listener 계약을 테스트한다.
2. 앱 수명 listener를 한 번 등록하고 capture는 `/capture`, graph는 `/graph`로 이동한다.
3. 등록 실패는 로컬 diagnostic으로 남기되 앱 mount를 막지 않는다.

## Task 3: 캡처→Living Graph 자동 반영 통합 검증

**Files**

- Create: `apps/desktop/e2e/shell-capture-verify.ts`
- Create: `apps/desktop/playwright.shell-capture.config.ts`
- Add/Modify: 관련 source contract test

1. Tauri IPC in-memory stub에서 캡처 저장, knowledge query invalidate, 그래프 자동 분석
   commit을 한 흐름으로 검증한다.
2. 중복 실행에서 완료 watermark가 있는 항목을 다시 commit하지 않는지 확인한다.
3. shell event payload가 기존 capture/graph route로 이어지는 계약을 검증한다.

## Task 4: 패키지 런타임과 전체 프로그램 증거

**Files**

- Create: `thoughts/shared/research/2026-08-31_living-graph-phase-e-verification.md`
- Modify: `docs/plans/2026-08-31-living-knowledge-graph-design.md`
- Modify: `docs/plans/2026-08-31-living-graph-phase-e.md`

1. shell Rust 테스트, desktop unit/E2E, lint/typecheck/build, workspace JS/Rust, sync E2E를 실행한다.
2. 패키지 앱에서 트레이 메뉴, 창 숨김·복원, 전역 단축키→캡처, 캡처 저장→그래프 반영을
   가능한 범위까지 실제 실행한다.
3. OS 접근성 권한이나 물리 키 입력에 의존해 자동화하지 못한 항목은 담당자·명령·기대
   결과를 수동 게이트로 남기고 전체 완료로 과장하지 않는다.
