---
date: 2026-03-25T15:30:00+09:00
researcher: Claude
git_commit: 646bd987e3736ff7d1c481d26e0eeed463258033
branch: main
repository: Glimpse
topic: "packages/core Rust 연결 방안: JSI/Craby, tRPC-like Wrapper"
tags: [research, packages-core, rust, jsi, tauri, react-native, integration]
status: complete
last_updated: 2026-03-25
last_updated_by: Claude
---

# 리서치: packages/core Rust 연결 방안

**날짜**: 2026-03-25T15:30:00+09:00
**연구자**: Claude
**Git Commit**: 646bd987e3736ff7d1c481d26e0eeed463258033
**Branch**: main
**Repository**: Glimpse

## 연구 질문

현대 `@packages/core/`에 있는 TypeScript 코드를 Rust로 연결하는 방법. 다음 옵션들 검토:
1. Craby 또는 JSI에 직접 등록 방식
2. tRPC 느낌의 wrapper 구성

## 요약

`packages/core`의 `CoreClient` 인터페이스는 21개의 메서드로 구성된 명확한 포트/어댑터 패턴을 따르고 있어 Rust 연결에 최적화되어 있음. 3가지 접근 방식을 분석했고, 프로젝트 상황에 따라 다음 순서로 추천:

1. **Mobile (React Native)**: JSI + C++ Bridge → Rust FFI (llama.rn 패턴 참고)
2. **Desktop**: 기존 Tauri Command 패턴 확장
3. **통합**: tRPC-like Wrapper로 플랫폼 추상화

## 상세 분석

### 1. 현재 packages/core 아키텍처

#### CoreClient 인터페이스 (`packages/core/src/ports/core-client.ts:24-57`)

```typescript
export interface CoreClient {
  // 동기 메서드 (3개)
  calculateTagOverlap(input: CalculateTagOverlapInput): number;
  calculateNextReview(input: CalculateNextReviewInput): CalculateNextReviewOutput;
  initializeReviewSchedule(input: InitializeReviewScheduleInput): InitializeReviewScheduleOutput;

  // 비동기 메서드 (18개)
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
Adapter Implementation (LocalCoreClient)
    ↓
Storage Layer (KeyValueStorage → AsyncStorage/localStorage)
```

#### 기존 LocalCoreClient 구현 (`packages/core/src/adapters/local/local-core-client.ts`)

- 365 lines, 순수 TypeScript
- JSON serialization으로 in-memory store 관리
- Store Key: `'glimpse-core-store-v1'`
- 5개 컬렉션: knowledgeItems, conversations, messages, recommendations, feedbackEvents

### 2. 데스크톱 Tauri 패턴 분석 (`apps/desktop/src-tauri/`)

#### Rust Commands (`apps/desktop/src-tauri/src/commands.rs`)

```rust
#[tauri::command]
pub fn run_completion(
    request: CompletionRequest,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<CompletionResponse, String>

#[tauri::command]
pub fn run_embedding(
    request: EmbeddingRequest,
    _state: tauri::State<'_, DesktopRuntimeState>,
) -> Result<EmbeddingResponse, String>
```

#### TypeScript Bridge (`apps/desktop/src/features/local-llm/desktop-llm-service.ts`)

```typescript
function createTauriBridge(): DesktopLLMBridge {
  return {
    runCompletion: (request) =>
      invoke<CompletionResponse>('run_completion', { request }),
  };
}
```

**장점**: 이미 프로젝트에 통합됨, 타입 안전, serde로 camelCase 자동 변환

### 3. React Native JSI 패턴 (llama.rn 분석)

#### 아키텍처

```
JavaScript → JSI → C++ Bridge → Rust (FFI) → Core Logic
```

#### 핵심 파일들 (node_modules/llama.rn 참고)

1. **JSI 바인딩** (`cpp/jsi/RNLlamaJSI.cpp`):
   ```cpp
   void installJSIBindings(
       jsi::Runtime& runtime,
       std::shared_ptr<react::CallInvoker> callInvoker
   );
   ```

2. **iOS 브릿지** (`ios/RNLlama.mm`):
   ```objc
   - (void)install:(RCTPromiseResolveBlock)resolve
            withRejecter:(RCTPromiseRejectBlock)reject
   {
       RCTCxxBridge *cxxBridge = (RCTCxxBridge *)bridge.batchedBridge;
       // JSI 바인딩 설치
   }
   ```

3. **Android 브릿지** (`android/src/main/java/com/rnllama/RNLlamaModule.java`):
   ```java
   @Override
   public void install(Promise promise) {
       long jsContextPointer = context.getJavaScriptContextHolder().get();
       CallInvokerHolderImpl holder = (CallInvokerHolderImpl)
           context.getCatalystInstance().getJSCallInvokerHolder();
       installJSIBindings(jsContextPointer, holder);
   }
   ```

4. **TypeScript 인터페이스** (`src/jsi.ts`):
   ```typescript
   declare global {
     var llamaInitContext: (contextId: number, params: NativeContextParams) => Promise<any>
     var llamaCompletion: (contextId: number, params: NativeCompletionParams) => Promise<NativeCompletionResult>
   }
   ```

### 4. tRPC-like Wrapper 패턴

#### 기존 Router 패턴 (`apps/mobile/src/features/ai/metadata/router.ts`)

```typescript
export function createMetadataRouter(config: RouterConfig = defaultConfig): AiMetadataService {
  return {
    async generate(input: MetadataInput): Promise<Result<MetadataOutput>> {
      const target = getTarget();
      const result = await executeTarget(target, input);
      return result;
    },
  };
}
```

#### 추천 통합 패턴

```typescript
// packages/core/src/ai/unified-bridge.ts
export function createUnifiedBridge(): AiMetadataService {
  if (isTauriAvailable()) {
    return createTauriBridge();
  }
  if (isReactNativeAvailable()) {
    return createNativeModuleBridge();
  }
  return createStaticFallback();
}
```

## 연결 방안 비교

### Option A: JSI + C++ Bridge → Rust FFI (Mobile 권장)

**구조**: `JavaScript → JSI → C++ Bridge → Rust (FFI)`

**장점**:
- JSI의 높은 성능 유지
- llama.rn 패턴 재사용
- 브릿지 오버헤드 최소화

**단점**:
- 빌드 설정 복잡
- C++ 브릿지 레이어 필요

**구현 단계**:
1. Rust 라이브러리 작성 (`cargo-c` 또는 `cbindgen`으로 C ABI 생성)
2. C++ JSI 래퍼 작성 (llama.rn 패턴 참고)
3. iOS/Android 플랫폼 통합
4. TypeScript 글로벌 함수 선언

### Option B: Expo Module with Rust Backend

**구조**: `JavaScript → Expo Module API → Kotlin/Swift → Rust (JNI/ObjC-FFI)`

**장점**:
- 표준 Expo 모듈 패턴
- 유지보수 용이
- TypeScript 통합 우수

**단점**:
- 브릿지 오버헤드 (JSI보다 느림)
- 플랫폼별 코드 증가

### Option C: Tauri Command Pattern (Desktop)

**구조**: `TypeScript → Tauri invoke → Rust Command`

**장점**:
- 이미 데스크톱에 구현됨
- 타입 안전
- serde로 자동 직렬화

**확장 방안**:
- CoreClient 메서드를 Tauri commands로 추가
- `apps/desktop/src-tauri/src/commands.rs` 확장

## 코드 참조

### CoreClient 인터페이스
- `packages/core/src/ports/core-client.ts:24-57` - CoreClient 인터페이스 정의
- `packages/core/src/adapters/local/local-core-client.ts:101-365` - LocalCoreClient 구현
- `packages/core/src/adapters/local/local-core-store.ts:1-186` - 스토어 관리

### 타입 정의
- `packages/shared/src/index.ts:1-163` - 공유 타입 (KnowledgeItem, Message, etc.)

### 데스크톱 Rust
- `apps/desktop/src-tauri/src/main.rs:1-22` - Tauri 진입점
- `apps/desktop/src-tauri/src/commands.rs:1-136` - Rust commands
- `apps/desktop/src-tauri/src/models.rs` - Rust 모델 (serde)

### 모바일
- `apps/mobile/src/features/core/mobile-core-client.ts:1-89` - 모바일 래퍼
- `apps/mobile/src/features/core/native-core-client.native.ts:1-2` - 네이티브 진입점

## 아키텍처 인사이트

### 1. 인터페이스 경계가 명확함
CoreClient는 Rust 교체를 위한 완벽한 경계. 21개 메서드가 모두 명확히 정의됨.

### 2. 데이터 직렬화 용이
모든 데이터 구조가 `@glimpse/shared`에 정의되어 JSON으로 직렬화 가능.

### 3. 에러 처리 매핑
Effect 기반 에러 처리가 Rust Result 타입과 잘 매핑됨.

### 4. 스토리지 추상화
KeyValueStorage 포트를 Rust에서 구현 가능 (SQLite, LMDB, RocksDB 등)

### 5. 순수 계산 함수
`calculateTagOverlap`, `calculateNextReview`는 순수 계산이라 Rust 이식에 최적.

## 추천 구현 전략

### Phase 1: Rust CoreClient 어댑터 프로토타입

1. **Rust 라이브러리 구조**:
   ```
   packages/core-rust/
   ├── Cargo.toml
   ├── src/
   │   ├── lib.rs
   │   ├── core_client.rs  # CoreClient trait 구현
   │   ├── storage.rs      # SQLite/LMDB 스토리지
   │   └── ffi.rs          # C ABI exports
   ```

2. **CoreClient Rust Trait**:
   ```rust
   pub trait CoreClient: Send + Sync {
       fn calculate_tag_overlap(&self, input: TagOverlapInput) -> i32;
       fn calculate_next_review(&self, input: NextReviewInput) -> NextReviewOutput;
       // ... 21개 메서드
   }
   ```

### Phase 2: 플랫폼별 바인딩

**Mobile (React Native)**:
- llama.rn 패턴으로 JSI 바인딩
- `cargo-ndk`로 Android NDK 빌드
- `cargo-xcode`로 iOS 프레임워크

**Desktop (Tauri)**:
- 기존 commands.rs 패턴 확장
- 새 commands 추가: `core_save_knowledge_item`, etc.

### Phase 3: TypeScript 통합

```typescript
// packages/core/src/adapters/rust/rust-core-client.ts
import { invokeRustCore } from './ffi';

export function createRustCoreClient(): CoreClient {
  return {
    calculateTagOverlap: (input) => invokeRustCore('calculate_tag_overlap', input),
    saveKnowledgeItem: async (item) => invokeRustCore('save_knowledge_item', item),
    // ...
  };
}
```

### Phase 4: 점진적 마이그레이션

1. 읽기 전용 메서드부터 Rust로 이동
2. 기능 플래그로 JS/Rust 전환
3. 웹 디버깅용 JS 폴백 유지

## Rust 스토리지 옵션

| 옵션 | 장점 | 단점 |
|------|------|------|
| SQLite (rusqlite) | 안정적, 친숙함 | 설정 필요 |
| LMDB | 빠름, 임베디드 | 단일 writer |
| RocksDB | 고성능, Facebook | 빌드 복잡 |
| sled | Rust 네이티브 | 상대적 신규 |

**추천**: SQLite (안정성) 또는 sled (순수 Rust)

## 빌드 시스템 통합

### iOS
```json
// app.json plugins
{
  "plugins": [
    ["glimpse-core-rust", { "enableEntitlements": true }]
  ]
}
```

### Android
```groovy
// android/app/build.gradle
android {
    externalNativeBuild {
        cmake {
            path "src/main/cpp/CMakeLists.txt"
        }
    }
}
```

## 미해결 질문

1. **동기 vs 비동기 FFI**: JSI에서 동기 호출이 가능하지만, Rust의 async/await와 어떻게 통합할지?
2. **데이터 마이그레이션**: 기존 localStorage 데이터를 Rust 스토리지로 어떻게 이전할지?
3. **웹 플랫폼**: Rust를 WebAssembly로 컴파일할지, JS 폴백 유지할지?
4. **테스트 전략**: Rust 로직의 단위 테스트를 어떻게 작성할지?

## 다음 단계

1. `/create_spec`으로 구현 스펙 작성
2. Rust 프로토타입 (순수 계산 함수 3개)
3. JSI 바인딩 PoC (llama.rn 참고)
4. 성능 벤치마크 (JS vs Rust)
