# CI 복구·문서 정합화·수동 게이트 보강 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** CI 6연속 실패 2건(JS mock 오염, Android JNI 심볼)을 근본 수리하고, 수동 게이트 문서의 드리프트(미이관 항목 15건)를 단일 진실 소스로 정리한다.

**Architecture:** JS 실패는 3개 테스트 파일의 부분 core mock을 완전 mock으로 보강해 프로세스 전역 오염을 차단한다. Android 실패는 `glimpse_jni_init`에 `#[unsafe(no_mangle)]`을 추가해 C++ 트램폴린이 찾는 비맹글링 심볼을 보장한다. 문서 드리프트는 `2026-08-31_remaining-manual-gates.md`를 단일 진실 소스로 삼아 미이관 항목을 이관하고, 구형 플랜 문서에는 소화·이관 상태를 각인한다.

**Tech Stack:** Bun test (`mock.module`), Rust (`#[unsafe(no_mangle)]`, cargo-ndk), GitHub Actions, Markdown.

**근거 리서치:** `thoughts/shared/research/2026-08-31_18-23-35_project-direction-and-next-steps.md`

---

### Task 1: Android JNI 심볼 수리 (`#[unsafe(no_mangle)]` 추가)

**Files:**
- Modify: `packages/bridge-rust/src/sync_discovery/jni.rs:42`

**Step 1: 실패 확인 (로컬 재현)**

```sh
# aarch64-linux-android 타깃이 설치돼 있으면:
cargo build -p glimpse-bridge --release --target aarch64-linux-android
nm -g target/aarch64-linux-android/release/libglimpse_bridge.a | grep -E " T glimpse_jni_init$"
# 기대(현재): 빈 출력 — 비맹글링 심볼 없음 (legacy mangled _RNv...만 존재)
```

타깃 빌드가 어려우면 기존 artifact로 대체 확인:
```sh
nm -g target/aarch64-linux-android/release/libglimpse_bridge.a | grep glimpse_jni_init
# 기대(현재): _RNvNtNtCs...glimpse_jni_init 만 출력 → 결함 확증
```

**Step 2: 수리**

`packages/bridge-rust/src/sync_discovery/jni.rs`의 함수에 인젝터 추가 (같은 crate `lib.rs:107`의 `glimpse_ffi_init` 선례와 동일 스타일):

```rust
/// C ABI called from Kotlin via the `jni.GlimpseBridgeJni` loader shim: the
/// `Java_*` trampoline lives in `rustra-jsi-jni.cpp` (visible to dlsym) and
/// forwards here, since `--exclude-libs,ALL` keeps this staticlib's own
/// symbols out of the .so's dynamic table.
///
/// # Safety
/// `vm` must be the process `JavaVM` pointer (from `JNI_OnLoad`).
#[unsafe(no_mangle)]
pub unsafe extern "C" fn glimpse_jni_init(vm: *mut jni::sys::JavaVM) {
```

**Step 3: 수리 확인**

```sh
cargo build -p glimpse-bridge --release --target aarch64-linux-android
nm -g target/aarch64-linux-android/release/libglimpse_bridge.a | grep -E " T glimpse_jni_init$"
# 기대: `T glimpse_jni_init` (비맹글링) 출력
```

**Step 4: 호스트 회귀 확인**

```sh
cargo test -p glimpse-bridge
cargo clippy -p glimpse-bridge --all-targets -- -D warnings
# 기대: 모두 통과 (host 빌드는 #[cfg(target_os="android")]이라 jni.rs 미컴파일 —
# 회귀 없음을 확인하는 용도)
```

**Step 5: 커밋**

```sh
git add packages/bridge-rust/src/sync_discovery/jni.rs
git commit -m "fix(bridge): glimpse_jni_init no_mangle 누락 수리 — Android 링크 실패 근본 수리"
```

**주의:** 이 수정만으로는 CI의 Android job이 그린이 되는지 push 후 확인해야 한다(Step 3이 동일 링크 경로를 로컬에서 증명). 커밋된 구형 `libglimpse_bridge.a`는 갱신 대상이 아니다 — CI는 매번 fresh 빌드를 사용하고, 로컬 Android 빌드 시 `bun run --cwd apps/mobile build:bridge:android`로 재생성한다(문서화는 Task 4).

---

### Task 2: JS 테스트 부분 core mock 완전화 (프로세스 전역 오염 차단)

**Files:**
- Modify: `apps/desktop/src/features/ai/providers/byok-provider.test.ts:26`
- Modify: `apps/desktop/src/lib/settings-storage.test.ts:37-39`
- Modify: `apps/desktop/src/features/local-llm/desktop-llm-service.test.ts:18`

**배경(확증된 재현):**

```sh
bun -e "import { mock } from 'bun:test'; \
  mock.module('@tauri-apps/api/core', () => ({ invoke: async () => null })); \
  await import('@tauri-apps/api/event');"
# → SyntaxError: Export named 'transformCallback' not found
```

bun의 `mock.module`은 프로세스 전역이고, `@tauri-apps/api/event` 2.10.1은 1행에서
`import { invoke, transformCallback } from './core.js'`를 정적으로 수행한다.
`invoke`만 있는 부분 mock이 먼저 등록되면 이후 로드되는 어떤 테스트의 진짜 event.js
import도 폭발한다(CI Linux 워커 순서에서 발현).

**Step 1: 공용 완전 core mock 스텐서 생성**

Create: `apps/desktop/src/test/tauri-core-mock.ts`

```ts
/**
 * bun mock.module 프로세스 전역 오염 대비용 완전 core mock.
 *
 * @tauri-apps/api/event 2.10.x는 core.js에서 transformCallback을 정적 import
 * 한다. invoke만 있는 부분 mock이 먼저 등록되면, 이후 테스트의 진짜 event.js
 * 로드가 "Export named 'transformCallback' not found"로 폭발한다(CI Linux에서
 * 재현). core를 mock하는 모든 테스트는 이 팩토리를 사용한다.
 */
export function tauriCoreMocks(invoke: (cmd: string, args?: unknown) => unknown) {
  return {
    invoke,
    transformCallback: (callback: unknown, once?: boolean) => {
      void once;
      void callback;
      return 0;
    },
    convertFileSrc: (filePath: string) => filePath,
    isTauri: () => false,
  };
}
```

**Step 2: 세 테스트의 mock 교체**

각 파일에서 `mock.module('@tauri-apps/api/core', () => ({ ... }))`를 팩토리 사용으로 교체:

```ts
import { tauriCoreMocks } from '../../test/tauri-core-mock'; // 경로는 파일 위치에 맞춤

mock.module('@tauri-apps/api/core', () => tauriCoreMocks(invokeMock));
// desktop-llm-service.test.ts는 기존 event mock 유지:
mock.module('@tauri-apps/api/event', () => ({ listen: async () => () => {} }));
```

**Step 3: 오염 회귀 테스트 추가**

Create: `apps/desktop/src/test/tauri-core-mock.test.ts`

```ts
import { describe, expect, mock, test } from 'bun:test';
import { tauriCoreMocks } from './tauri-core-mock';

/**
 * 계약: 이 팩토리로 core를 mock한 뒤에도 진짜 event.js가 로드 가능해야 한다.
 * 부분 mock이 돌아오면 이 테스트가 CI/Linux에서 먼저 폭발한다.
 */
describe('tauriCoreMocks 완전성 계약', () => {
  test('완전 mock 등록 후 진짜 event.js가 로드된다', async () => {
    mock.module('@tauri-apps/api/core', () => tauriCoreMocks(async () => null));
    const event = await import('@tauri-apps/api/event');
    expect(typeof event.listen).toBe('function');
  });
});
```

**Step 4: 데스크톱 전체 테스트 실행**

```sh
bun test packages/features/src apps/desktop/src packages/ui
bun test packages/features/src apps/desktop/src packages/ui --coverage
# 기대: 186 pass / 0 fail (두 명령 모두)
```

**Step 5: 오염 순서 직접 재현 검증 (수리 전 실패 시나리오)**

```sh
bun -e "import { mock } from 'bun:test'; \
  const { tauriCoreMocks } = await import('./apps/desktop/src/test/tauri-core-mock.ts'); \
  mock.module('@tauri-apps/api/core', () => tauriCoreMocks(async () => null)); \
  await import('@tauri-apps/api/event'); console.log('event.js OK');"
# 기대: `event.js OK`
```

**Step 6: 커밋**

```sh
git add apps/desktop/src/test/tauri-core-mock.ts apps/desktop/src/test/tauri-core-mock.test.ts \
  apps/desktop/src/features/ai/providers/byok-provider.test.ts \
  apps/desktop/src/lib/settings-storage.test.ts \
  apps/desktop/src/features/local-llm/desktop-llm-service.test.ts
git commit -m "test(desktop): 부분 core mock 완전화 — event.js transformCallback 오염 수리"
```

---

### Task 3: 전체 자동 게이트 회귀 확인

**Step 1: 게이트 전수 실행**

```sh
bun run lint
bun run typecheck
bun run desktop:typecheck
bun test
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
cd apps/desktop && bun run test:e2e && cd ../..
```

기대: 전부 exit 0. `bun test`는 878+ pass여야 한다.

**Step 2: 커밋(변경이 남아 있다면)** — 없으면 생략.

---

### Task 4: 수동 게이트 문서 단일 진실 소스 정합화

**Files:**
- Modify: `thoughts/shared/research/2026-08-31_remaining-manual-gates.md`
- Modify: `docs/plans/2026-08-30-graph-capture-infra.md:589-600`
- Modify: `docs/plans/2026-08-30-apply-loop.md:1126-1134`
- Modify: `docs/plans/2026-08-29-bidirectional-delta-sync.md:615-621`
- Modify: `docs/plans/2026-08-28-core-loop-completion.md:1149-1153`
- Modify: `docs/plans/2026-08-21-gap-remediation-plan.md:222-260`

**Step 1: remaining-manual-gates.md에 미이관 항목 추가**

기존 11항목에 다음을 추가하고, 각 항목에 명령·기대 결과 필드를 채운다:

- Phase E 수동 2항목은 이미 `2026-08-31_living-graph-phase-e-verification.md:74-81`에
  담당자·명령·기대 결과가 기록돼 있으므로 링크로 이관 표기 (중복 기술 금지).
- 08-30 graph-capture GUI 4항목 (ShareExtension 공유→저장, 데스크톱 그래프 증분·
  노드 클릭, 모바일 상세 연결 섹션, 시뮬레이터 LLM 스트리밍 회귀)
- 08-30 apply-loop GUI 3항목 (채팅 참조 칩, digest 최근 연결, Shortcuts 흡수)
- delta-sync 시뮬레이터 수동 E2E 6항목 (페어링, 캡처 전파, 채팅 반영, 복습 일치,
  강제 종료 복구, 네트워크 단절 복구)
- core-loop 알림 세부 4항목 (설정 변경 반영, 백그라운드 재스케줄, 24h 재발화,
  라벨링 백필)
- gap-remediation의 Tauri updater endpoint/서명 키 항목

**Step 2: 원 플랜 문서들에 이관 각인**

각 원 문서의 미체크 체크리스트 위에 한 줄 추가:

```markdown
> 수동 게이트는 `thoughts/shared/research/2026-08-31_remaining-manual-gates.md`로
> 이관됨 (2026-08-31). 아래 목록은 이관 당시 스냅샷.
```

**Step 3: 문서 드리프트 재확인**

```sh
grep -c "\[ \]" thoughts/shared/research/2026-08-31_remaining-manual-gates.md
# 기대: 기존 11 + 신규 15± = 26± (중복 이관 없이)
grep -rn "transformCallback\|진행 예정" docs/plans/2026-08-31-living-knowledge-graph-design.md | head
# 기대: "진행 예정" 0건 (1aa7182에서 이미 수리됨)
```

**Step 4: 커밋**

```sh
git add thoughts/shared/research/2026-08-31_remaining-manual-gates.md docs/plans/
git commit -m "docs(gates): 수동 게이트 단일 진실 소스 정합화 — 미이관 15건 이관·각인"
```

---

### Task 5: Phase E 수동 게이트 문서와 Android 재생성 절차 반영 (Task 1 후속)

**Files:**
- Modify: `thoughts/shared/research/2026-08-31_remaining-manual-gates.md`

**Step 1:** Android OCR 실기기 항목에 다음 전제를 한 줄 추가한다:

```markdown
- 전제: `bun run --cwd apps/mobile build:bridge:android`로 커밋된
  `libglimpse_bridge.a`를 재생성할 것 (32979f2 이후 커밋된 .a는
  `glimpse_jni_init` 심볼이 없는 구버전 — no_mangle 수리 빌드로 갱신 필요).
```

**Step 2:** 커밋은 Task 4와 함께하거나 별도 `docs(gates):` 커밋으로.

---

### Task 6: push와 CI 그린 확인

**Step 1:** `git push origin main` (로컬 ahead 커밋들과 본 플랜 커밋 포함).

**Step 2:** `gh run watch` 또는 `gh run list --limit 1`로 최종 CI 확인.

기대: JS job, Android job, Desktop smoke 전부 success. 실패 시 로그의
`transformCallback`/`glimpse_jni_init` 재출현 여부로 수리 유효성 판정.

**주의:** push는 사용자 확인 후 수행한다(외부 작업).
