---
date: 2026-03-25T15:30:00+09:00
researcher: Claude
git_commit: 646bd987e3736ff7d1c481d26e0eeed463258033
branch: main
repository: Glimpse
topic: "packages/core Rust 연결 방안: Nitro Modules + Rust FFI"
tags: [research, packages-core, rust, nitro-modules, jsi, tauri, react-native, integration]
status: complete
last_updated: 2026-03-26
last_updated_by: Claude
---

> ⚠️ **역사 문서** — Nitro/cbindgen 아키텍처(2026-03) 기준으로 작성됨.
> 2026-08 rustra 통합으로 무효된 내용을 포함한다. 현재 아키텍처는
> `docs/plans/2026-08-16-rustra-integration-design.md` 참조.


# 리서치: packages/core Rust 연결 방안

**날짜**: 2026-03-25T15:30:00+09:00
**연구자**: Claude
**Git Commit**: 646bd987e3736ff7d1c481d26e0eeed463258033
**Branch**: main
**Repository**: Glimpse

## 연구 질문

현대 `@packages/core/`에 있는 TypeScript 코드를 Rust로 연결하는 방법. 다음 옵션들 검토:
1. Nitro Modules + Rust FFI (Mobile 권장)
2. Tauri Command Pattern (Desktop)

## 요약

`packages/core`의 `CoreClient` 인터페이스는 21개의 메서드로 구성된 명확한 포트/어댑터 패턴을 따르고 있어 Rust 연결에 최적화되어 있음.

**최종 추천:**
1. **Mobile (React Native)**: Nitro Modules + Rust FFI (sync FFI on background thread)
2. **Desktop**: 기존 Tauri Command 패턴 확장

## 옵션 분석 결과

### Craby (❌ 사용 불가)

| 항목 | 상태 |
|------|------|
| 웹사이트 (craby.rs) | ✅ 존재 (마케팅 페이지만) |
| GitHub 저장소 | ❌ 404 Not Found |
| npm 패키지 | ❌ 9년 된 관련없는 패키지만 존재 |
| 문서 | ❌ 접근 불가 |
| **결론** | **Vaporware - 사용 불가** |

### Nitro Modules (✅ 권장)

| 항목 | 상태 |
|------|------|
| GitHub | ✅ github.com/mrousavy/nitro (1.8k stars) |
| npm | ✅ react-native-nitro-modules |
| 문서 | ✅ nitro.margelo.com |
| 언어 지원 | C++, Swift, Kotlin |
| **Rust 지원** | ⚠️ 네이티브 미지원 (Issue #258), FFI로 연결 가능 |

### Zig + React Native (❌ 생태계 없음)

| 항목 | 상태 |
|------|------|
| GitHub Topics | ❌ `zig-react-native` 존재하지 않음 |
| 관련 프로젝트 | ❌ 없음 |
| **결론** | **아직 생태계가 형성되지 않음** |

---

## 핵심 이해: Sync FFI + Async Pattern

### FFI는 항상 Synchronous

```
┌─────────────┐         ┌─────────────┐
│   C++/JS    │ ──────► │    Rust     │
│             │  call   │   FFI fn    │
│   BLOCKED   │ ◄────── │  executes   │
│   waiting   │ return  │  returns    │
└─────────────┘         └─────────────┘
```

**FFI 경계는 항상 동기 블로킹 호출이다.** Rust의 `async fn`은 FFI를 넘을 수 없다.

### 하지만 다른 스레드에서 실행하면 된다!

```
┌─────────────────────────────────────────────────────────────┐
│                    ✅ GOOD: Background Thread               │
├─────────────────────────────────────────────────────────────┤
│  JS Thread                    │  Background Thread          │
│  ├── call save() ────────┐   │                              │
│  │  (returns Promise)    │   │  ├── rust_save() runs here  │
│  ├── do other work       │   │  │   (blocks, but who cares)│
│  ├── render UI           │   │  │                          │
│  ├── handle clicks       │   │  └── returns result ─────┐  │
│  │                       │   │                           │  │
│  └── await result ◄──────┼───┼───────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**핵심 통찰:**
- "Sync" = 함수가 완료될 때까지 블로킹
- "Async" = 함수가 즉시 반환, 결과는 나중에
- **이것은 어떤 스레드에서 실행되는지와는 별개!**

### Nitro의 Promise.async() 패턴

```cpp
// Nitro C++ module
std::shared_ptr<Promise<KnowledgeItem>> saveKnowledgeItem(NewKnowledgeItem item) override {
  return Promise<KnowledgeItem>::async([=]() {
    // 이 람다는 백그라운드 스레드에서 실행됨
    // Rust FFI는 동기지만, JS 스레드는 블로킹되지 않음
    return rust_save_knowledge_item(item);
  });
}
```

### Rust 측면 - 변경 불필요!

```rust
// 이 코드는 이미 FFI에 완벽함
#[no_mangle]
pub extern "C" fn rust_save_knowledge_item(item: Item) -> Item {
    // 100ms 걸려도 문제없음 - 백그라운드 스레드에서 실행
    let storage = SqliteStorage::new(path)?;
    storage.insert_item(item)
}
```

### Rust 내부에서 async 사용하기

Rust는 내부적으로 async를 사용할 수 있음 (FFI는 여전히 sync):

```rust
#[no_mangle]
pub extern "C" fn rust_save_item(item: Item) -> Item {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        // 내부적으로는 async/await 사용 가능
        db.query().await
    })
}
```

---

## 상세 분석

### 1. 현재 packages/core 아키텍처

#### CoreClient 인터페이스 (`packages/core/src/ports/core-client.ts:24-57`)

```typescript
export interface CoreClient {
  // 동기 메서드 (3개) - JS 스레드에서 직접 실행 가능
  calculateTagOverlap(input: CalculateTagOverlapInput): number;
  calculateNextReview(input: CalculateNextReviewInput): CalculateNextReviewOutput;
  initializeReviewSchedule(input: InitializeReviewScheduleInput): InitializeReviewScheduleOutput;

  // 비동기 메서드 (18개) - Promise.async()로 래핑
  saveKnowledgeItem(item: NewKnowledgeItem): Promise<KnowledgeItem>;
  listKnowledgeItems(): Promise<KnowledgeItem[]>;
  // ... 총 21개 메서드
}
```

#### Port/Adapter 패턴 구조

```
Mobile App Feature Layer
    ↓
Application Layer (use cases with Pick<CoreClient>)
    ↓
Port Interface (CoreClient)
    ↓
Adapter Implementation (LocalCoreClient → RustCoreClient)
    ↓
Storage Layer (SQLite via rusqlite)
```

### 2. Nitro Modules 아키텍처

#### 공식 문서: https://nitro.margelo.com

**특징:**
- JSI 기반 고성능 네이티브 모듈
- TypeScript → C++/Swift/Kotlin 자동 생성
- `Promise<T>::async()`로 백그라운드 스레드 실행
- 타입 안전한 바인딩

#### 파일 구조

```
apps/mobile/src/features/core/
├── CoreClient.nitro.ts      # Nitro 스키마 정의
├── nitro/                   # 생성된 코드 (자동)
│   ├── cxx/
│   ├── swift/
│   └── kotlin/
└── HybridCoreClient.cpp     # Rust FFI 호출
```

#### Nitro 스키마 예시

```typescript
// CoreClient.nitro.ts
import type { KnowledgeItem, NewKnowledgeItem } from '@glimpse/shared';

export interface CoreClient extends HybridObject<{ ios: 'c++', android: 'c++' }> {
  // 동기 메서드
  calculateTagOverlap(left: KnowledgeItemLike, right: KnowledgeItemLike): number;

  // 비동기 메서드 (Promise 반환)
  saveKnowledgeItem(item: NewKnowledgeItem): Promise<KnowledgeItem>;
  listKnowledgeItems(): Promise<KnowledgeItem[]>;
}
```

#### C++ 구현 (Rust FFI 호출)

```cpp
// HybridCoreClient.cpp
#include "CoreClient.nitro.h"
#include "rust_core.h"  // cbindgen으로 생성된 Rust 헤더

class HybridCoreClient: public HybridCoreClientSpec {
public:
  // 동기 메서드 - JS 스레드에서 직접 실행
  double calculateTagOverlap(KnowledgeItemLike left, KnowledgeItemLike right) override {
    return rust_calculate_tag_overlap(left, right);
  }

  // 비동기 메서드 - 백그라운드 스레드에서 실행
  std::shared_ptr<Promise<KnowledgeItem>> saveKnowledgeItem(NewKnowledgeItem item) override {
    return Promise<KnowledgeItem>::async([=]() {
      return rust_save_knowledge_item(item);
    });
  }
};
```

### 3. 데스크톱 Tauri 패턴 분석 (`apps/desktop/src-tauri/`)

Tauri는 이미 Rust로 작성되어 있어 직접 `packages/core-rust` 사용 가능.

#### Cargo.toml 의존성 추가

```toml
[dependencies]
glimpse-core = { path = "../../../packages/core-rust" }
```

#### Tauri Commands

```rust
use glimpse_core::{CoreClientImpl, SqliteStorage};

pub struct DesktopCoreState {
    client: Mutex<CoreClientImpl>,
}

#[tauri::command]
pub async fn core_save_knowledge_item(
    item: NewKnowledgeItem,
    state: State<'_, DesktopCoreState>,
) -> Result<KnowledgeItem, String> {
    let client = state.client.lock().await;
    client.save_knowledge_item(item).await
        .map_err(|e| e.to_string())
}
```

---

## 연결 방안 비교

### Option A: Nitro Modules + Rust FFI (Mobile 권장) ✅

**구조**: `TypeScript → Nitro → C++ → Promise.async → Rust FFI`

**장점**:
- Nitro가 async/threading 처리
- Rust FFI는 단순 sync 함수만 작성
- 타입 안전한 코드 생성
- 활성적인 커뮤니티 (1.8k stars)

**단점**:
- C++ 브릿지 레이어 필요
- Rust가 네이티브 지원 언어가 아님 (Issue #258)

### Option B: Ditto rn-jsi-rust-bridging (대안)

**구조**: `TypeScript → JSI → Rust FFI`

- GitHub: https://github.com/getditto/rn-jsi-rust-bridging
- 17 stars, MIT license
- Nitro보다 간단하지만 기능도 적음

### Option C: Tauri Command Pattern (Desktop) ✅

**구조**: `TypeScript → Tauri invoke → Rust Command`

- 이미 데스크톱에 구현됨
- `packages/core-rust` 직접 사용 가능

---

## 추천 구현 전략

### Phase 1: Rust Core 라이브러리 (완료 ✅)

```
packages/core-rust/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── core_client/    # CoreClient 구현
│   ├── models.rs       # 데이터 모델
│   └── storage/        # SQLite 스토리지
```

### Phase 2: Nitro Modules 통합

1. **Nitro 스키마 정의**
   ```
   apps/mobile/src/features/core/CoreClient.nitro.ts
   ```

2. **C++ 구현체** (Rust FFI 호출)
   ```
   apps/mobile/src/features/core/HybridCoreClient.cpp
   ```

3. **Rust C ABI 헤더 생성**
   ```bash
   cbindgen --crate glimpse-core --output apps/mobile/cpp/rust_core.h
   ```

### Phase 3: Tauri 통합

```rust
// apps/desktop/src-tauri/src/core_commands.rs
use glimpse_core::CoreClientImpl;

#[tauri::command]
pub async fn core_list_knowledge_items(
    state: State<'_, CoreState>,
) -> Result<Vec<KnowledgeItem>, String> {
    state.client.list_knowledge_items().await
        .map_err(|e| e.to_string())
}
```

---

## Rust 스토리지 옵션

| 옵션 | 장점 | 단점 |
|------|------|------|
| SQLite (rusqlite) | 안정적, 친숙함 | 설정 필요 |
| sled | Rust 네이티브 | 상대적 신규 |

**선택**: SQLite (rusqlite with bundled feature)

---

## 해결된 질문

### 1. 동기 vs 비동기 FFI?

**답변**: FFI는 항상 sync. Nitro의 `Promise.async()`가 백그라운드 스레드에서 실행하므로 JS 스레드는 블로킹되지 않음.

### 2. Rust async/await와 통합?

**답변**: Rust 내부에서는 `tokio::runtime::block_on()`으로 async 사용 가능. FFI 경계는 여전히 sync.

---

## 참고 자료

- **Nitro Modules**: https://nitro.margelo.com
- **Nitro GitHub**: https://github.com/mrousavy/nitro
- **Ditto Rust-JSI**: https://github.com/getditto/rn-jsi-rust-bridging
- **llama.rn 패턴**: 프로젝트 내 `node_modules/llama.rn` 참고
- **rusqlite 문서**: https://docs.rs/rusqlite

## 다음 단계

1. Phase 2 구현: Nitro Modules 통합
2. C++ HybridObject 구현체 작성
3. cbindgen으로 Rust 헤더 생성
4. iOS/Android 빌드 테스트
