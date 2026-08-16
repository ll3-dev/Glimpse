# 2주차 — 모바일 rustra JSI 전환 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Glimpse 모바일(Expo RN)의 도메인 CRUD 경로를 Nitro 브릿지에서 rustra JSI 네이티브 모듈로 교체하고, 검증 후 Nitro 도메인 브릿지를 삭제한다. `llama.rn` LLM 경로는 유지.

**Architecture:** rustra 예제(`~/dev/ll3/rustra-bridge/examples/react-native-calculator/modules/rustra-jsi/`)의 JSI 네이티브 모듈(iOS `.mm` + C++ HostObject, Android JNI + cargo-ndk)을 `apps/mobile/modules/rustra-jsi/`로 이식한다. Rust는 `packages/bridge-rust`를 iOS/Android staticlib로 빌드하고(`glimpse_ffi_*` 심볼), `--cpp-output` 생성 코덱으로 JSI fast path를 쓴다. TS 측은 `@rustra/react-native`의 `createFastEngine`/`createReactNativeEngine` + `@glimpse/bridge-generated` 생성 클라이언트로 `CoreClient`를 구현한다.

**Tech Stack:** Expo (~55, expo-router), rustra 0.1.1 (npm `@rustra/react-native`, crates.io `rustra = "=0.1.1"`), cargo-ndk/Xcode 툴체인, JSI.

**선결 조건 (구현 전 확인):**
- rustra 예제의 JSI 모듈 소스 구조 파악: `~/dev/ll3/rustra-bridge/examples/react-native-calculator/modules/rustra-jsi/{ios,android}/`
- rustra FFI 노출: `packages/bridge-rust`가 `register_ffi()`를 호출해 `rustra_ffi_invoke` 등의 `extern "C"` 심볼을 staticlib에 export해야 함 (현재는 Tauri 경로만 있고 `register_ffi_with_default` 미호출 — 확인 필요)
- `--cpp-output` 코덱 생성: `rustra generate --schema ... --cpp-output` CLI 또는 Rust 사이드 생성 경로 확인

---

### Task 1: bridge-rust FFI 노출 + 모바일 staticlib 빌드 스크립트

**Files:**
- Modify: `packages/bridge-rust/src/lib.rs` — `glimpse_package()`에 `register_ffi_with_default(FfiFormat::Json)` 호출 추가 (Tauri `rustra_dispatch`는 영향 없음 확인: dispatch는 package invoke를 직접 쓰고 FFI 전역 등록과 독립)
- Create: `apps/mobile/scripts/build-core-rust-mobile.sh` — 기존 `build-core-rust-{ios,android}.sh`를 참고해 bridge-rust도 함께 staticlib로 빌드 (crate-type staticlib 필요하면 `packages/bridge-rust/Cargo.toml`에 `[lib] crate-type = ["lib", "staticlib"]` 추가)

**Verify:** iOS 시뮬레이터 타깃으로 `cargo build -p glimpse-bridge --target aarch64-apple-ios-sim` 성공 + `nm`으로 `rustra_ffi_invoke_json` 심볼 확인.

**Commit:** `feat(bridge): expose FFI symbols for mobile staticlib`

### Task 2: JSI 네이티브 모듈 이식 (iOS)

**Files:**
- Create: `apps/mobile/modules/rustra-jsi/` — 예제의 `RustraJSIModule.{mm,h}`, `RustraJSIBridge.{cpp,hpp}` + 생성 코덱 `rustra-generated-codecs.{hpp,cpp}` 복사 후 Glimpse용으로 조정 (모듈명, 심볼 참조)
- Modify: `apps/mobile/GlimpseCore.podspec` 또는 신규 podspec — rustra-jsi 모듈 pod 추가
- Modify: `apps/mobile/ios/` — 모듈 등록 (예제의 AppDelegate/bridge 설정 참조)

**Verify:** `cd apps/mobile && bunx expo run:ios` 빌드 성공.

**Commit:** `feat(mobile): port rustra JSI native module (iOS)`

### Task 3: JSI 네이티브 모듈 이식 (Android)

**Files:**
- Create: `apps/mobile/modules/rustra-jsi/android/` — `RustraJSIModule.kt`, `rustra-jsi-jni.cpp`, CMakeLists.txt (예제 참조)
- Modify: `apps/mobile/android/` — settings.gradle/build.gradle 연결
- Modify: bridge-rust Android 빌드 스크립트와 연계

**Verify:** `bunx expo run:android` 빌드 성공 (에뮬레이터 기동은 선택).

**Commit:** `feat(mobile): port rustra JSI native module (Android)`

### Task 4: TS 엔진 연결 + CoreClient 전환

**Files:**
- Modify: `apps/mobile/package.json` — `@rustra/react-native@0.1.1`, `@glimpse/bridge-generated: workspace:*`
- Create: `apps/mobile/src/features/core/rustra-core-client.ts` — 데스크톱과 동일한 어댑터 (생성 클라이언트 → CoreClient, 엔진은 `createFastEngine` 또는 폴백 `createReactNativeEngine`)
- Modify: 모바일 앱 부트스트랩 — 엔진 `configure()` (예: `App.tsx`/레이아웃 루트)
- Modify: 기존 core client 팩토리 참조를 rustra 클라이언트로 전환 (fallback 경로는 유지 — 네이티브 모듈 부재 시 기존 경로)

**Verify:** `bunx tsc --noEmit` (mobile 설정), `bun run lint`.

**Commit:** `feat(mobile): CoreClient over rustra generated client`

### Task 5: 스모크 + Nitro 도메인 브릿지 삭제

- iOS 시뮬레이터에서 앱 기동, Library/Capture/Chat 동작 확인 (자동화 가능하면 통과, 아니면 기동+콘솔 에러 무결 확인)
- Nitro 도메인 브릿지 삭제: `apps/mobile/generate/CoreClient.nitro.ts`, 관련 `cpp/` 쉼 중 도메인 분, `src/features/core/` 구현체 — **LLM·임베딩 등 여전히 Nitro를 쓰는 부분이 있는지 먼저 전수 조사 후 도메인 분만 삭제**
- 문서 갱신: `typed-bridge-development.md` 최신화, 디자인 문서에 2주차 결과 추가

**Commit:** `refactor(mobile): remove Nitro domain bridge, rustra is the path` + `docs: week-2 mobile rustra migration complete`

---

## 리스크와 되돌림

- JSI 모듈 이식이 예제보다 오래 걸리면: Task 4에서 `createReactNativeEngine`(JSON slow path)으로 먼저 전환하고 fast path는 3주차로 미룬다.
- Nitro 삭제 범위 애매하면(다른 기능이 공유): 삭제를 4주차로 미루고 전환만 완료한다.
- 모바일 빌드 환경 문제(Xcode/NDK 버전)는 사전에 `apps/mobile/scripts/` 기존 스크립트 요구사항과 맞춘다.
