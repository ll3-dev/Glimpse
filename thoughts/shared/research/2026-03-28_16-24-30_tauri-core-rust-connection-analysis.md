---
date: 2026-03-28T16:24:30+09:00
researcher: Claude
git_commit: b4a9464417fbadb4be69f5ab96327ff859d37580
branch: main
repository: Glimpse
topic: "Tauri Desktop ↔ core-rust 연결 현황 분석"
tags: [research, tauri, core-rust, desktop, ffi, integration, architecture]
status: complete
last_updated: 2026-03-28
last_updated_by: Claude
---

# 리서치: Tauri Desktop ↔ core-rust 연결 현황 분석

**날짜**: 2026-03-28T16:24:30+09:00
**연구자**: Claude
**Git Commit**: b4a9464417fbadb4be69f5ab96327ff859d37580
**Branch**: main
**Repository**: Glimpse

## 연구 질문

Tauri 데스크탑 앱이 `packages/core-rust`와 얼마나 연결되어 있는지 확인

## 요약

**핵심 발견: Tauri와 core-rust는 현재 완전히 분리되어 있다.**

- Tauri의 `Cargo.toml`에 `glimpse-core` 의존성이 없음
- Tauri Rust 코드에서 core-rust에 대한 `use` 문이 전혀 없음
- Tauri는 자체 mock 기반 LLM 런타임 서비스만 구현
- Workspace에는 두 크레이트가 모두 등록되어 있으나, 의존성 연결은 없음
- Mobile(React Native)은 core-rust와 완전히 연결되어 있음 (Nitro FFI 브릿지)

## 상세 분석

### 1. Workspace 구조

루트 `Cargo.toml`에 두 크레이트가 workspace 멤버로 등록:

```toml
[workspace]
members = [
  "apps/desktop/src-tauri",    # Tauri 데스크탑 앱
  "packages/core-rust",         # 공유 코어 로직
]
```

**하지만** `apps/desktop/src-tauri/Cargo.toml`은 `glimpse-core`를 의존성으로 선언하지 않음:

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
tauri = { version = "2.0.0", features = [] }
# glimpse-core 의존성 없음!
```

### 2. Tauri 현재 구현 범위

`apps/desktop/src-tauri/src/` 파일 구성:

| 파일 | 역할 | core-rust 연결 |
|------|------|----------------|
| `main.rs` | Tauri 빌더 + invoke_handler 등록 | 없음 |
| `commands.rs` | 8개 `#[tauri::command]` 핸들러 | 없음 |
| `models.rs` | LLM 런타임 데이터 모델 | 없음 (로컬 정의) |
| `state.rs` | `DesktopRuntimeState` 인메모리 상태 | 없음 |
| `services/runtime_service.rs` | `DesktopRuntimeService` 비즈니스 로직 | 없음 |

**Tauri가 노출하는 8개 명령** (모두 LLM 런타임 관련):
1. `list_available_runtimes` - 사용 가능한 LLM 런타임 조회
2. `list_managed_models` - 관리 중인 모델 목록
3. `download_model` - 모델 다운로드
4. `load_model` - 모델 메모리 로드
5. `unload_model` - 모델 언로드
6. `run_completion` - 텍스트 완성 실행
7. `run_embedding` - 임베딩 생성
8. `get_runtime_health` - 런타임 상태 확인

### 3. core-rust가 제공하지만 Tauri에서 누락된 기능

core-rust(`packages/core-rust/`)는 다음 도메인 로직을 제공하나, **Tauri에 연결된 것은 0개**:

| 도메인 | core-rust 모듈 | Tauri 연결 |
|--------|----------------|------------|
| Knowledge Items | `core_client/knowledge.rs` | ❌ |
| Conversations | `core_client/conversation.rs` | ❌ |
| Messages | `core_client/message.rs` | ❌ |
| Recommendations | `core_client/recommendation.rs` | ❌ |
| Feedback Events | `core_client/feedback.rs` | ❌ |
| Review Scheduling | `core_client/review.rs` | ❌ |
| SQLite Storage | `storage/sqlite/` | ❌ |
| Spaced Repetition | `review.rs` (SM-2) | ❌ |

### 4. Mobile vs Desktop 비교

| 항목 | Mobile (React Native) | Desktop (Tauri) |
|------|----------------------|-----------------|
| 코어 연결 | ✅ 완전 연결 | ❌ 연결 없음 |
| 브릿지 기술 | Nitro Modules + C++ FFI | Tauri Commands (mock) |
| FFI 레이어 | `packages/core-rust/src/ffi/` | 없음 |
| 비즈니스 로직 | SharedCore/CoreClientImpl | 자체 DesktopRuntimeService |
| 데이터 저장 | SQLite (core-rust) | 없음 (인메모리만) |
| 타입 동기화 | TypeScript ↔ Rust 매핑 | LLM 런타임 타입만 |

### 5. core-rust의 다중 플랫폼 준비 상태

`packages/core-rust/Cargo.toml`의 crate-type 설정:

```toml
[lib]
crate-type = ["staticlib", "cdylib", "rlib"]
```

- `staticlib` / `cdylib`: Mobile (iOS/Android) FFI용
- `rlib`: **Rust-to-Rust 직접 사용 가능** → Tauri에서 `glimpse-core`를 직접 의존성으로 추가하면 FFI 없이 Rust 레벨에서 바로 사용 가능

`SharedCore`가 플랫폼 비의존적 진입점으로 설계되어 있어, Tauri에서도 동일하게 사용 가능:

```rust
// packages/core-rust/src/application/mod.rs
pub struct SharedCore {
    client: CoreClientImpl,
}
```

## 코드 참조

### Tauri (연결 없음)
- `apps/desktop/src-tauri/Cargo.toml` - 의존성에 glimpse-core 없음
- `apps/desktop/src-tauri/src/main.rs` - invoke_handler에 LLM 명령만 등록
- `apps/desktop/src-tauri/src/commands.rs` - 8개 LLM 런타임 명령
- `apps/desktop/src-tauri/src/state.rs` - 인메모리 mock 상태
- `apps/desktop/src-tauri/src/services/runtime_service.rs` - LLM 런타임 서비스

### core-rust (Tauri 대기 중)
- `packages/core-rust/src/lib.rs` - 공개 API exports (SharedCore, CoreClientImpl 등)
- `packages/core-rust/src/application/mod.rs` - SharedCore 진입점
- `packages/core-rust/src/core_client/mod.rs` - 전체 비즈니스 로직
- `packages/core-rust/src/ffi/` - FFI 레이어 (Mobile용, Tauri는 불필요)
- `packages/core-rust/src/storage/sqlite/` - SQLite 영속성

### TypeScript 연결
- `apps/desktop/src/features/local-llm/desktop-llm-service.ts` - Tauri invoke 호출부
- `apps/desktop/src/types/glimpse-desktop-bridge.d.ts` - LLM 타입만 정의됨

## 아키텍처 인사이트

### 현재 아키텍처 (분리됨)
```
Mobile:  TS → Nitro → C++ → Rust FFI → core-rust → SQLite
Desktop: TS → Tauri invoke → Mock Rust State (인메모리)
```

### 권장 아키텍처 (통합)
```
Mobile:  TS → Nitro → C++ → Rust FFI → core-rust → SQLite
Desktop: TS → Tauri invoke → core-rust (rlib 직접) → SQLite
```

Tauri는 Rust 생태계이므로 Mobile과 달리 C++ FFI가 불필요. `glimpse-core`를 `rlib`로 직접 의존하여 `SharedCore`를 사용하면 됨.

### 기존 리서치에서의 언급
- `thoughts/shared/plans/2026-03-25_packages-core-rust-integration.md`에서 Desktop Tauri 연결을 Phase 3으로 계획
- `docs/nitro-rust-architecture.md`에서 "architectural risk" 및 "active contract and tooling drift risk"로 명시
- 원칙: "shared domain/use-case logic belongs in `packages/core-rust`, transport adapters should stay thin"

## 히스토리 컨텍스트 (thoughts/ 디렉토리)

- `thoughts/shared/research/2026-03-25_packages-core-rust-integration.md` - core-rust 연결 방안 최초 리서치 (Tauri Command Pattern을 Desktop 옵션으로 문서화)
- `thoughts/shared/plans/2026-03-25_packages-core-rust-integration.md` - Desktop Tauri 통합을 Phase 3으로 계획 (구현 예정)
- `thoughts/shared/plans/2026-03-26_nitro-mobile-bridge.md` - Mobile Nitro 브릿지 구현 계획 (완료됨)

## 관련 리서치

- [packages/core-rust 연동 리서치](thoughts/shared/research/2026-03-25_packages-core-rust-integration.md)

## 미해결 질문

1. **Desktop에 core-rust 연결 시점**: Phase 3 계획으로 문서화되어 있으나 우선순위/타임라인 불명확
2. **LLM 런타임 서비스의 위치**: 현재 Tauri에만 있는 LLM 런타임 로직을 core-rust로 이전할지, 아니면 Tauri 고유로 유지할지 결정 필요
3. **데이터 동기화**: Desktop이 core-rust의 SQLite를 사용하게 되면 Mobile과의 데이터 동기화 전략 필요
4. **타입 정의 통합**: `apps/desktop/src/types/`의 LLM 타입을 `packages/shared/`의 공유 타입과 통합 방안
