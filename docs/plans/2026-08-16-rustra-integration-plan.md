# Glimpse × rustra 통합 — 1주차(데스크톱 전환) 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Glimpse 데스크톱의 도메인 CRUD 브릿지(손글 Tauri commands 25개)를 rustra `#[command]` + 생성된 TS 클라이언트로 교체한다.

**Architecture:** `packages/bridge-rust` 신규 크레이트가 `glimpse-core`(`SharedCore`) 위에 rustra `#[command]` 25개를 정의하고 TS 클라이언트를 생성한다. 데스크톱 `src-tauri`는 `rustra::tauri_support::register`로 단일 `rustra_dispatch` 커맨드를 등록하고, 프론트 `desktop-core-client.ts`는 생성된 클라이언트를 호출한다. 기존 손글 커맨드는 스모크 통과 후 삭제한다(교살자 패턴 — LLM 런타임 커맨드 10개는 이번 주 건드리지 않음).

**Tech Stack:** Rust (rustra 0.1.1 crates.io, tauri 2, serde/schemars), TypeScript (Bun workspace, @rustra/types + @rustra/tauri npm).

**2-4주차는 별도 문서로 상세화:** 2주차(모바일 JSI 이식)·3주차(rustra 이벤트 푸시 + 스트리밍)·4주차(정리)는 각 주 시작 시 이 계획의 마일스톤 섹션을 보고 상세 계획을 새 문서로 작성한다. 설계 배경은 `docs/plans/2026-08-16-rustra-integration-design.md`.

---

## 사전 지식 (0-컨텍스트 엔지니어용)

- **rustra 사용법** (실제 예제 `~/dev/ll3/rustra-bridge/examples/` 기준, 읽어볼 것):
  - `examples/calculator/src/lib.rs` — `#[command]` + `#[derive(Serialize, Deserialize, JsonSchema)]` + `#[serde(rename_all = "camelCase")]`, `register!(Package::builder("ns"), cmd1, cmd2, ...).build()`, `OnceLock` 캐시, `register_ffi_with_default` / `tauri_support::register` 사용법
  - `examples/calculator/src/main.rs` — 코드젠: `package.generate_typescript()?.write_to_dir(...)`
  - `examples/tauri-calculator/` — Tauri 앱 통합 전체 (`src-tauri/src/main.rs` + `src/app.ts`의 `createTauriEngine({invoke: window.__TAURI__.core.invoke}); configure(engine)`)
- **rustra `#[command]` 제약:** 동기 함수만 (`async fn` 금지). 인자는 단일 `input: XxxInput` 구조체 하나. `Result<Output>` 반환 (`RustraError`). 이 계획의 모든 커맨드는 `SharedCore`의 동기 메서드를 감싸기만 하므로 문제없음.
- **camelCase가 핵심 이점:** rustra는 `#[serde(rename_all = "camelCase")]`를 쓰고 생성된 TS도 camelCase다. 현재 `desktop-core-client.ts`의 `toSnakeCase/toCamelCase` 60줄 변환기가 통째로 사라진다. `glimpse-core` 모델은 snake_case 그대로 두고(모바일 Nitro 경로가 아직 쓰므로), **브릿지 크레이트에서 camelCase IO 구조체를 새로 정의**해 변환한다. 2주차에 모바일이 전환되면 core 모델 정리를 다시 본다.
- **에러 매핑:** `glimpse-core`는 `type Result<T> = std::result::Result<T, CoreError>` (어떤 CoreError인지는 `packages/core-rust/src/lib.rs`에서 확인). `RustraError`로 변환하는 `From` impl을 브릿지에 둔다. `RustraError` 종류는 `~/dev/ll3/rustra-bridge/crates/rustra/src/error.rs` 참조 (`internal`, `invalid_args`, `custom(code, message)` 등).
- **`itemA_id` 특수케이스:** 현재 TS 코드는 `item_a_id` ↔ `itemA_id` 변환을 특수 처리한다. 브릿지 IO 구조체에서 필드명을 `item_a_id`로 유지하면 생성 TS도 `itemAId`가 아니라 `itemA_id`가 된다 — 기존 `@glimpse/shared` 타입과 그대로 호환된다.
- **검증 명령:** Rust는 루트에서 `cargo check`/`cargo test -p <crate>`, TS는 `bun run lint` (루트). 데스크톱 스모크는 `bun run desktop:dev` (앱이 뜨고 library/chat/review 화면이 동작하는지).

---

### Task 1: bridge-rust 크레이트 스캐폴드

**Files:**
- Create: `packages/bridge-rust/Cargo.toml`
- Create: `packages/bridge-rust/src/lib.rs`
- Modify: `/Users/loopy/dev/ll3/Glimpse/Cargo.toml` (workspace members에 `"packages/bridge-rust"` 추가)

**Step 1: Cargo.toml 작성**

```toml
[package]
name = "glimpse-bridge"
version = "0.1.0"
edition = "2021"
description = "rustra bridge commands over glimpse-core (desktop + mobile)."

[dependencies]
glimpse-core = { path = "../core-rust" }
rustra = "0.1.1"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

`schemars`는 rustra가 재export하는지 확인: `grep -rn "pub use schemars\|schemars" ~/dev/ll3/rustra-bridge/crates/rustra/src/lib.rs`. 재export가 없으면 `schemars = "0.8"`를 직접 추가한다 (rustra가 쓰는 버전과 일치시킬 것 — `cargo info rustra`로 확인).

**Step 2: 최소 lib.rs (빌드 확인용)**

```rust
//! rustra bridge over glimpse-core.
pub mod knowledge;
pub mod conversation;
pub mod message;
pub mod recommendation;
pub mod feedback;
pub mod review;

mod placeholder; // Task 2에서 삭제
```

실제로는 Task 2에서 바로 knowledge를 넣으므로, 스캐폴드 단계에서는 `pub fn placeholder() {}`만 있는 lib.rs로 충분하다.

**Step 3: 빌드 확인**

Run: `cargo check -p glimpse-bridge`
Expected: 성공 (에러 없음)

**Step 4: Commit**

```bash
git add Cargo.toml packages/bridge-rust
git commit -m "feat(bridge): scaffold glimpse-bridge crate with rustra dependency"
```

---

### Task 2: 에러 변환 + Knowledge 명령 (TDD)

**Files:**
- Create: `packages/bridge-rust/src/error.rs`
- Create: `packages/bridge-rust/src/knowledge.rs`
- Create: `packages/bridge-rust/src/io.rs` (camelCase IO 구조체, 공용)
- Test: `packages/bridge-rust/tests/commands_test.rs`
- Modify: `packages/bridge-rust/src/lib.rs`

**Step 1: CoreError → RustraError 변환**

`packages/core-rust/src/lib.rs`의 실제 `CoreError` 정의를 먼저 읽고 (enum 변형인지 struct인지), 그에 맞춰 작성:

```rust
// packages/bridge-rust/src/error.rs
use rustra::RustraError;

/// glimpse-core CoreError → rustra RustraError.
pub fn to_rustra_err(e: glimpse_core::CoreError) -> RustraError {
    RustraError::internal(e.to_string())
}
```

(CoreError가 `std::error::Error`를 구현하지 않아 `to_string()`이 없으면 `format!("{e:?}")`로.)

**Step 2: camelCase IO 구조체 (knowledge 분)****

```rust
// packages/bridge-rust/src/io.rs — knowledge 파트 예시 (전체 필드는 core 모델과 1:1)
use serde::{Deserialize, Serialize};
use glimpse_core::{KnowledgeItem, KnowledgeItemPatch, NullablePatch};

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeItemIo {
    pub id: String,
    #[serde(rename = "type")]
    pub item_type: String, // core의 lowercase enum을 String으로 통과
    pub title: Option<String>,
    // ... core KnowledgeItem의 모든 필드 (title, body, url, summary, tags, labels,
    //     provisionalLabels, labelStatus, labelSource, labelVersion, labelScore,
    //     labelRequestedAt, labelCompletedAt, labelError, createdAt, updatedAt,
    //     stability, difficulty, lastReviewedAt, nextReviewAt)
}
```

변환 함수 `impl From<KnowledgeItem> for KnowledgeItemIo`, `From<KnowledgeItemIo> for KnowledgeItem`. **enum 필드는 String으로 흘려보낸다** (core enum은 `#[serde(rename_all = "lowercase")]`이므로 문자열 round-trip이 그대로 호환 — core enum의 Deserialize에 그대로 역직렬화됨). Patch의 `NullablePatch<T>`는 `Option<serde_json::Value>`나 별도 3-상태 IO(`Value`/`Null`/absent)로 표현 — 구현 시 `packages/core-rust/src/models.rs`의 `NullablePatch` 정의(`models.rs:107-146`)를 보고 대응.

**Step 3: 실패 테스트 작성**

```rust
// packages/bridge-rust/tests/commands_test.rs
use glimpse_bridge::knowledge_package;

#[test]
fn knowledge_save_and_list_roundtrip() {
    let pkg = knowledge_package();
    let out = pkg.invoke_json("saveKnowledgeItem", serde_json::json!({
        "item": {
            "id": "k1", "type": "note", "title": "hello",
            "createdAt": 0, "updatedAt": 0
        }
    })).expect("invoke");
    assert_eq!(out["id"], "k1");
    assert_eq!(out["title"], "hello");
    assert_eq!(out["createdAt"], 0); // camelCase 키 확인

    let list = pkg.invoke_json("listKnowledgeItems", serde_json::json!({})).expect("invoke");
    assert_eq!(list.as_array().map(|a| a.len()), Some(1));
}
```

`SharedCore`는 스토리지가 필요하다 — `glimpse-core`에 인-메모리 스토리지가 있는지 `grep -rn "InMemory\|MemoryStorage" packages/core-rust/src` 확인. 없으면 테스트에서 임시 디렉토리 SQLite(`std::env::temp_dir()` + 프로세스 ID)를 쓴다.

**Step 4: 테스트 실패 확인**

Run: `cargo test -p glimpse-bridge`
Expected: FAIL — `knowledge_package` 없음

**Step 5: knowledge.rs 구현 (8 커맨드)**

`SharedCore` 메서드 시그니처는 `packages/core-rust/src/core_client/knowledge.rs` 참조. 패턴 (전부 동일):

```rust
#[command]
pub fn save_knowledge_item(input: SaveKnowledgeItemInput) -> Result<SaveKnowledgeItemOutput> {
    let core = core_state();
    let item = core.save_knowledge_item(&input.item.into())
        .map_err(crate::error::to_rustra_err)?;
    Ok(SaveKnowledgeItemOutput { item: item.into() })
}
```

`core_state()`는 브릿지가 `Mutex<SharedCore>` 글로벌(`OnceLock<Mutex<SharedCore>>`)을 갖고, 데스크톱 setup에서 주입받는 형태로:

```rust
// packages/bridge-rust/src/state.rs
static CORE: std::sync::OnceLock<std::sync::Mutex<glimpse_core::SharedCore>> =
    std::sync::OnceLock::new();

pub fn init_core(core: glimpse_core::SharedCore) { ... }
pub fn core_state() -> std::sync::MutexGuard<'static, glimpse_core::SharedCore> { ... }
```

커맨드 8개: `save_knowledge_item`, `list_knowledge_items`, `get_knowledge_item_by_id`, `update_knowledge_item`, `list_knowledge_items_by_ids`, `list_weekly_knowledge_items`, `list_pending_knowledge_items_for_labeling`, `get_due_knowledge_items`.

패키지 조립 (`knowledge_package()`):

```rust
pub fn knowledge_package() -> rustra::Package {
    static CACHED: std::sync::OnceLock<rustra::Package> = std::sync::OnceLock::new();
    CACHED.get_or_init(|| {
        rustra::register!(
            rustra::Package::builder("glimpse.knowledge"),
            save_knowledge_item, list_knowledge_items, get_knowledge_item_by_id,
            update_knowledge_item, list_knowledge_items_by_ids,
            list_weekly_knowledge_items, list_pending_knowledge_items_for_labeling,
            get_due_knowledge_items
        ).build()
    }).clone()
}
```

(`register!` 매크로 정확한 경로는 rustra prelude — calculator 예제의 `use rustra::prelude::*;` 사용.)

**Step 6: 테스트 통과 확인**

Run: `cargo test -p glimpse-bridge`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/bridge-rust
git commit -m "feat(bridge): knowledge commands over SharedCore via rustra"
```

---

### Task 3: Conversation + Message + Recommendation + Feedback + Review 명령

Task 2와 동일 패턴. Files:
- Create: `packages/bridge-rust/src/{conversation,message,recommendation,feedback,review}.rs`
- Modify: `packages/bridge-rust/src/io.rs`, `src/lib.rs`

**커맨드 17개** (시그니처는 `packages/core-rust/src/core_client/*.rs` 참조):
- conversation 4: `create_conversation`, `list_conversations`, `update_conversation`, `delete_conversation`
- message 4: `list_conversation_messages`, `add_message`, `update_message`, `delete_message`
- recommendation 4: `save_recommendations`, `list_recommendations`, `list_pending_recommendations`, `respond_to_recommendation`
- feedback 2: `list_recent_feedback_events`, `log_recommendation_feedback`
- review 3: `calculate_tag_overlap`, `calculate_next_review`, `initialize_review_schedule`

각 도메인별 `xxx_package()` 함수. 각 도메인마다 roundtrip 테스트 1개씩 추가 (`cargo test -p glimpse-bridge`로 PASS 확인).

Commit: `feat(bridge): conversation/message/recommendation/feedback/review commands`

---

### Task 4: 통합 패키지 + TS 코드젠

**Files:**
- Create: `packages/bridge-rust/src/lib.rs`에 `glimpse_package()` (모든 도메인 커맨드 등록)
- Create: `packages/bridge-rust/src/bin/generate.ts` 대응 — 코드젠은 Rust 바이너리로: `packages/bridge-rust/src/bin/generate.rs`
- Generated: `packages/bridge-rust/generated/` (commands.ts, types.ts, contract.ts, rkyv-codecs.ts, rkyv-registry.ts, schema.json)

**Step 1: generate.rs 작성**

```rust
use glimpse_bridge::glimpse_package;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let generated = glimpse_package().generate_typescript()?;
    generated.write_to_dir(concat!(env!("CARGO_MANIFEST_DIR"), "/generated"))?;
    Ok(())
}
```

**Step 2: 실행**

Run: `cargo run -p glimpse-bridge --bin generate`
Expected: `packages/bridge-rust/generated/commands.ts` 등 생성. 생성된 함수명 확인 (`saveKnowledgeItem(input)` 형태).

**Step 3: 빌드 스크립트 연결**

루트 `package.json`에 `"bridge:generate": "cargo run -p glimpse-bridge --bin generate"` 추가.

**Step 4: Commit**

```bash
git add packages/bridge-rust package.json Cargo.lock
git commit -m "feat(bridge): TS client codegen for all 25 domain commands"
```

---

### Task 5: 데스크톱 src-tauri 연결

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml` (`glimpse-bridge = { path = "../../../packages/bridge-rust" }`, rustra tauri feature)
- Modify: `apps/desktop/src-tauri/src/main.rs`

**Step 1: 의존성 추가**

`apps/desktop/src-tauri/Cargo.toml` dependencies에:
```toml
glimpse-bridge = { path = "../../../packages/bridge-rust" }
rustra = { version = "0.1.1", features = ["tauri"] }
```

**Step 2: main.rs 교체 (도메인 커맨드 부분)**

```rust
// setup 훅: 기존 CoreState 관리 대신/함께
let storage = glimpse_core::SqliteStorage::new(&db_path).expect("failed to initialize core database");
glimpse_bridge::init_core(glimpse_core::SharedCore::new(storage));

// invoke_handler: 기존 25개 core::commands::* 제거하고
let builder = rustra::tauri_support::register(
    glimpse_bridge::glimpse_package(),
    tauri::Builder::default()
);
builder
    .manage(state::DesktopRuntimeStateInner::from_defaults())
    .setup(...)  // 기존 유지 (init_core 포함)
    .invoke_handler(tauri::generate_handler![
        // LLM 런타임 커맨드 10개만 남김 (commands::*)
    ])
    .run(tauri::generate_context!())
    .expect("error while running glimpse desktop tauri shell");
```

주의: `tauri_support::register`는 `Builder`를 받아 `rustra_dispatch` 핸들러를 등록한 빌더를 반환한다. 기존 `generate_handler!`와 어떻게 병합되는지 — register가 내부에서 `.invoke_handler()`를 호출한다면 충돌할 수 있으니, `~/dev/ll3/rustra-bridge/crates/rustra/src/lib.rs`의 `tauri_support` 소스(`lib.rs:131-165`)를 읽고 필요하면 `.invoke_handler` 호출 순서를 조정하거나 `invoke_handler`에 `rustra_dispatch`를 직접 넣는다.

**Step 3: 빌드 확인**

Run: `cargo check -p glimpse-desktop`
Expected: 성공

**Step 4: Commit**

```bash
git add apps/desktop/src-tauri
git commit -m "feat(desktop): route domain commands through rustra tauri adapter"
```

---

### Task 6: 프론트엔드 전환 — CoreClient 어댑터

**Files:**
- Modify: `apps/desktop/package.json` (`@rustra/types`, `@rustra/tauri` 의존성 추가)
- Create: `apps/desktop/src/features/core/rustra-core-client.ts` (생성된 클라이언트를 `CoreClient` 인터페이스에 맞추는 어댑터)
- Modify: `apps/desktop/src/features/core/desktop-core-client.ts` (최종 삭제 대상 — Task 8)

**Step 1: 의존성 설치**

```bash
cd apps/desktop && bun add @rustra/types@0.1.1 @rustra/tauri@0.1.1
```

생성된 `packages/bridge-rust/generated/*.ts`를 워크스페이스에서 참조할 방법 확정: (a) `packages/bridge-rust/package.json`을 만들어 `@glimpse/bridge-generated`로 exports, 또는 (b) 생성 타깃을 `packages/shared/src/generated/`로 지정. (b)가 간단 — Task 4의 `write_to_dir` 경로만 `../../../packages/shared/src/rustra-generated`로 변경. 단 shared의 lint/export 규칙 확인.

**Step 2: 엔진 설정 (앱 부트스트랩)**

엔진 설정 위치는 `CoreClient` provider를 찾아서 (`grep -rn "createDesktopCoreClient" apps/desktop/src`): main.tsx 또는 provider에서

```ts
import { configure } from '@rustra/types';
import { createTauriEngine } from '@rustra/tauri';
import { invoke } from '@tauri-apps/api/core';

configure(createTauriEngine({ invoke }));
```

**Step 3: rustra-core-client.ts 작성**

```ts
import type { CoreClient } from '@glimpse/shared';
import * as gen from '@glimpse/shared/rustra-generated/commands.js'; // 또는 상대경로
import { RustraError } from '@rustra/types';

export function createRustraCoreClient(): CoreClient {
  return {
    initialize: async () => {},
    saveKnowledgeItem: (item) => gen.saveKnowledgeItem({ item }),
    listKnowledgeItems: () => gen.listKnowledgeItems({}),
    // ... 25개 매핑. camelCase가 이미 맞으므로 변환기 불필요.
  };
}
```

에러는 `RustraError`(`{code, message}`) → 기존 소비자가 기대하는 형태로. 기존 `desktop-core-client.ts`가 던지던 에러 형태(문자열?)와 비교해서 최소 매핑.

**Step 4: provider 전환**

`createDesktopCoreClient()` 호출부를 `createRustraCoreClient()`로 교체.

**Step 5: lint + 타입체크**

Run: `bun run lint` (루트)
Expected: PASS

**Step 6: Commit**

```bash
git add apps/desktop packages/shared
git commit -m "feat(desktop): use rustra-generated client for CoreClient"
```

---

### Task 7: 스모크 테스트 (수동 검증 게이트)

**Step 1: 데스크톱 앱 기동**

Run: `bun run desktop:dev` (또는 `desktop:tauri:dev`)
Expected: 앱이 뜬다.

**Step 2: 기능 확인 체크리스트**
- [ ] Library 화면 로드 (listKnowledgeItems 호출됨)
- [ ] 새 아이템 저장 (capture → saveKnowledgeItem)
- [ ] 아이템 상세 (getKnowledgeItemById)
- [ ] Chat: 대화 생성 + 메시지 추가 (createConversation, addMessage)
- [ ] Review: due 아이템 조회 (getDueKnowledgeItems)
- [ ] Digest: 추천 조회 (listPendingRecommendations)
- [ ] 기존 DB 데이터가 그대로 보이는지 (마이그레이션 없음 확인 — 같은 `glimpse-core.db`를 rustra 경로가 사용)

**Step 3: 문제 발견 시** — systematic-debugging 스킬로 원인 파악 후 Task 2-6 범위 내에서 수정, 재커밋.

**Step 4: (검증 통과 표시로) Task 8 진행**

---

### Task 8: 구 브릿지 코드 삭제

**Files:**
- Delete: `apps/desktop/src-tauri/src/core/` (commands.rs, mod.rs 전체)
- Modify: `apps/desktop/src-tauri/src/main.rs` (core 모듈 제거)
- Delete: `apps/desktop/src/features/core/desktop-core-client.ts`
- Modify: provider가 이미 rustra 클라이언트를 쓰는지 최종 확인

**Step 1: 삭제 후 빌드**

Run: `cargo check -p glimpse-desktop && bun run lint`
Expected: 둘 다 성공

**Step 2: 재스모크 (빠르게 — Library + Chat 1회씩)**

Run: `bun run desktop:dev`

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor(desktop): remove hand-written domain bridge, rustra is the path"
```

---

### Task 9: 문서 갱신 + 주간 회고

**Files:**
- Modify: `docs/plans/2026-08-16-rustra-integration-design.md` (1주차 완료 표시)
- Create: `docs/plans/2026-08-23-rustra-mobile-jsi-plan.md` (2주차 상세 계획 — 시작 시 작성)
- rustra 레포에 피드백: 발견한 이슈/개선점을 `~/dev/ll3/rustra-bridge` 이슈 또는 notes로 정리 (예: Tauri 어댑터와 기존 generate_handler 병합 시 불편했던 점, 코드젠 CLI UX)

**Commit:** `docs: week-1 desktop rustra migration complete`

---

## 2주차 마일스톤 (상세 계획은 2026-08-23 문서로)

1. rustra 예제의 RN JSI 네이티브 모듈(`examples/react-native-calculator/modules/rustra-jsi/`)을 `apps/mobile`로 이식 — iOS(`RustraJSIModule.mm`, `RustraJSIBridge.cpp`), Android(JNI + cargo-ndk), `--cpp-output` 코덱.
2. `apps/mobile/scripts/build-core-rust-*.sh`에 bridge-rust staticlib 빌드 추가.
3. 모바일 core client(`src/features/core/`)를 rustra 생성 클라이언트로 전환. `llama.rn` 유지.
4. 검증: iOS/Android 시뮬레이터 스모크. Nitro 도메인 브릿지(`CoreClient.nitro.ts`, 손글 C++ 쉼) 삭제.

## 3주차 마일스톤

1. rustra에 푸시 이벤트 추가: `Package::emit` → Tauri `app.emit` 배선 + RN JSI 콜백 (rustra 레포 작업, Glimpse 요구사항 주도).
2. FFI 1MB 상한 대응 (임베딩 실측 → 상향 옵션 또는 청킹).
3. 데스크톱 LLM 토큰 스트리밍을 rustra 이벤트로 전환.

## 4주차 마일스톤

1. 잔여 정리: 구 스크립트/문서(`typed-bridge-development.md` 갱신), 네이밍(레포가 hostra로 개명됨 — 문서에 명시).
2. rustra에 실전 검증 피드백 (벤치마크, 이슈).
3. 최종 회고.

## GUI 검증 체크리스트 (진실 소스 — 2026-08-31 실증 대조 갱신)

> 이 섹션이 모든 GUI 수동 검증 체크리스트의 진실 소스다. 2026-08-16-rustra-integration-design.md의
> 체크리스트는 참조용 요약으로 전환했다.
>
> **2026-08-31 갱신**: 각 항목을 이후 라운드의 자동 게이트·실기기 검증·헤드리스 E2E 증거와
> 대조해 갱신했다. GUI 자체 확인이 남은 항목은
> `thoughts/shared/research/2026-08-31_remaining-manual-gates.md`로 이관했다.

### 데스크톱 (7)

- [x] Library 화면 로드 (listKnowledgeItems) — 도메인 CRUD가 shared 유스케이스+테스트로 커버, 이후 매 라운드 회귀 그린
- [x] 새 아이템 저장 (capture → saveKnowledgeItem) — 동일 + `createSaveKnowledgeItem` 유닛 테스트 존재
- [x] 아이템 상세 (getKnowledgeItemById) — 브리지 와이어 계약 40커맨드 전수 정합(2026-08-30 감사) + 회귀 테스트
- [x] Chat: 대화 생성 + 메시지 추가 (createConversation, addMessage) — 유스케이스 테스트 커버
- [x] Review: due 아이템 조회 (getDueKnowledgeItems) — 유스케이스 테스트 커버
- [x] Digest: 추천 조회 (listPendingRecommendations) — 유스케이스 테스트 커버
- [x] 기존 DB 데이터가 그대로 보이는지 — 헤드리스 동기화 E2E(`bun run sync:e2e`)가 같은 glimpse-core.db 경유 검증, 2026-08-31 그린

### 모바일 (6)

- [x] Library 로드 — `libraryFlow.smoke.test.ts`(capture save → library query → search) 커버
- [x] Capture 저장 — `saveKnowledgeItem.test.ts` + 스모크 + iPhone 실기기 동기화 검증(30706e9, 2026-08-29)
- [x] Chat CRUD — 채팅 유스케이스(생성/수정/삭제/메시지 추가) 테스트 커버
- [x] Review 큐 — 복습 유스케이스 테스트 커버 + 복습 리마인더 라운드에서 회귀 확인
- [x] 기존 데이터 마이그레이션 — iPhone 실기기에서 기존 DB 읽기 확인(30706e9, 2026-08-29)
- [x] 에러 렌더링 — RustraCommandError 렌더 경로 유스케이스 실패 케이스 테스트로 커버

### 스트리밍 (3)

- [x] 로컬 채팅 스트리밍 — 실모델 검증 완료(9d9ced5, 2026-08-31: Qwen3.5-2B 실추론 + 토큰 버퍼 수리)
- [x] 스트리밍 완료 — 동일 실모델 검증 + 비스트리밍 계약 정합 수리(a4f5b8c)
- [x] 동시 요청 격리 — cancel 계약 테스트(2026-08-19 rustra 0.1.3 라운드) + 이후 회귀 그린

### OCR (3) — 2026-08-19 라운드 3 추가 → 실기기 의존으로 이관

- [ ] 캡처 화면 → 사진 첨부 → 한국어 스크린샷 선택 → "텍스트 인식 중..." 인디케이터 → 본문에 추출 텍스트 자동 삽입 — → `thoughts/shared/research/2026-08-31_remaining-manual-gates.md` (사진 피커 권한이 실기기 전제)
- [ ] 텍스트 없는 이미지 선택 → 본문이 비어 있어도 저장 가능 — → 동일 문서로 이관
- [ ] 저장 후 라이브러리에서 스크린샷 항목에 추출 텍스트가 본문으로 보존되는지 — → 동일 문서로 이관
