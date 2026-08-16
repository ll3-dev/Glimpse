# Glimpse × rustra 통합 디자인

- 날짜: 2026-08-16
- 상태: 승인됨 (접근법 A — 코어 우선 점진 통합)
- 목표 기간: ~1개월 (4주 마일스톤)

## 배경

Glimpse는 같은 Rust 도메인 코어(`packages/core-rust`, crate `glimpse-core`)를 두 개의 서로 다른 브릿지로 소비한다:

- **모바일** (Expo RN): Nitro/Nitrogen C++ 코드젠 + 손글 C++ 쉼 + cbindgen `glimpse_core.h` → Rust FFI (`apps/mobile/docs/typed-bridge-development.md`)
- **데스크톱** (Tauri 2): 손글 Tauri commands ~30개 (`apps/desktop/src-tauri/src/commands.rs`)

rustra (github.com/loopy-lim/rustra, 로컬 `~/dev/ll3/rustra-bridge`, v0.1.1)는 Rust `#[command]` 정의 → TS 클라이넌트 자동 생성 → Node/Bun/Tauri/RN/Lynx 어댑터로 동일 인터페이스 실행을 제공한다.

## 목표

1. 이중 브릿지 유지비 제거 — transport 어댑터만 남기고 도메인 명령 정의는 한 곳에서
2. TS↔Rust 타입 동기화 자동화 (지금은 손으로 맞춤)
3. 새 기능을 Rust 한 번 정의로 양 플랫폼에 동시 반영
4. Glimpse를 rustra의 실전 검증장으로 사용 — 실사용 요구사항으로 rustra 성장

비목표(1개월 내): LLM 엔진 자체의 통합(데스크톱 llama-cpp-2 / 모바일 llama.rn은 플랫폼별 유지, 인터페이스만 rustra), Electron/Deno/web 어댑터, rustra 1.0 API 동결.

## 조사에서 확인된 제약 (rustra 현재 상태)

- RN 어댑터는 실재하고 빠름: JSI HostObject + 생성된 C++ postcard 코덱 + Rust staticlib. iOS 0.95µs / Android 1.50µs (Nitro 대비 동등 이상). 단, npm `@rustra/react-native`는 TS 절반뿐 — 네이티브 모듈(iOS `.mm`/`RustraJSIBridge.cpp`, Android JNI + cargo-ndk)은 앱이 예제 코드 기반으로 직접 구축해야 함.
- Tauri 어댑터 동작함: 모든 명령이 단일 `rustra_dispatch` 커맨드로 라우팅 (`crates/rustra/src/lib.rs` `tauri_support`).
- **async 커맨드 미지원** — `#[command] fn`은 동기만. 긴 작업은 thread-spawn 우회 필요.
- **이벤트 푸시 없음** — `Package::emit`은 폴링(EventBus, drop-oldest, JSON payload)뿐. Tauri `app.emit`/RN 푸시 배선은 미구현.
- **FFI 페이로드 1MB 상한** (generic 경로).
- 레포 이름이 rustra → hostra로 변경됨 (npm 스코프는 `@rustra/*` 유지).

이 제약 중 async 미지원/이벤트 푸시 부재/1MB 상한은 Glimpse 통합 과정에서 rustra에 추가할 기능 목록이 된다.

## 접근법: A — 코어 우선 점진 통합 (교살자 패턴)

각 단계가 검증 지점이고, 중간에 되돌릴 수 있다. 기존 브릿지는 새 브릿지가 전면 검증될 때까지 존재한다가 마지막에 삭제된다.

### 1주차 — 데스크톱 전환 (리스크 최소 시작)

- `glimpse-core` 도메인 로직(SharedCore facade — knowledge, conversation, message, feedback, recommendation, review)을 rustra `#[command]`로 정의한 `glimpse-bridge` 크레이트 신설 (또는 core-rust 내 모듈).
- 데스크톱 `src-tauri`는 rustra `tauri_support::register` 사용. 프론트는 `desktop-core-client.ts`가 생성된 TS 클라이언트 호출.
- 기준: 데스크톱 기존 기능 회귀 없음. 손글 커맨드 ~25개(도메인 CRUD) 삭제.
- LLM 관련 커맨드(다운로드/로드/스트리밍)는 이 단계에서 그대로 유지.

### 2주차 — 모바일 전환

- rustra 예제의 JSI 네이티브 모듈을 Glimpse로 이식: iOS(`RustraJSIModule.mm` 등), Android(JNI + cargo-ndk), `--cpp-output` 생성 코덱.
- 도메인 명령 경로를 Nitro → rustra로 전환. `llama.rn`은 유지.
- 기준: iOS/Android 시뮬레이터에서 기존 기능 동작. Nitro 도메인 브릿지(`CoreClient.nitro.ts`, 손글 C++ 쉼) 삭제.

### 3주차 — 스트리밍 + rustra 기능 성장

- rustra에 **푸시 기반 이벤트 전달** 추가: Tauri `app.emit` 배선 + RN JSI 콜백(DCDHOST/HostObject 콜백). 이 작업 자체가 "Glimpse가 rustra를 성장시키는" 산출물.
- 1MB 상한 대응: 상향 옵션 또는 청킹(페이로드 측정 후 결정).
- 완성되면 LLM 토큰 스트리밍을 rustra 이벤트로 전환(데스크톱 먼저, 모바일 후속).
- 긴 작업(모델 다운로드 등)의 async 처리 방식 확정(thread-spawn + 이벤트).

### 4주차 — 정리

- 구 브릿지 잔여 코드·스크립트·문서 정리, `typed-bridge-development.md` 갱신.
- rustra 레포에 실전 검증 결과(벤치마크, 발견된 이슈) 피드백 — GitHub 이슈/문서.
- 레지스트리·런타임 헬스 등 양쪽에 남는 플랫폼별 코드 문서화.

## 아키텍처 (목표 상태)

```
packages/core-rust (glimpse-core)      ← 도메인 로직, 변경 없음
        │
packages/bridge-rust (신규)            ← rustra #[command] 정의 + generate_typescript()
        │                                (glimpse-core SharedCore 위의 얇은 어댑터)
        ├─ desktop: rustra tauri_support::register → 생성된 TS 클라이언트
        └─ mobile : rustra JSI 네이티브 모듈   → 생성된 TS 클라이언트

LLM 엔진 (플랫폼별 유지, 인터페이스만 추후 rustra화)
        ├─ desktop: src-tauri llama-cpp-2 커맨드 (3주차에 rustra 이벤트로)
        └─ mobile : llama.rn
```

## 오류 처리

- rustra `RustraError`(`{code,message}`)를 Glimpse 기존 에러 매핑에 맞춰 변환하는 TS 래퍼 유지 (`desktop-core-client.ts`/모바일 core client 자리).
- FFI 1MB 초과 페이로드: 명시적 에러 + 청킹 전략 (3주차에 확정).
- 폴링→푸시 전환 전까지 스트리밍은 기존 경로 유지 (전환은 원자적).

## 테스트 전략

- 각 주 마일스톤: `bun run lint` + 대상 플랫폼 스모크(`bun run web`/`ios`/`android`, 데스크톱 `desktop:dev`).
- 도메인 회귀: 기존 core CRUD 동작을 rustra 경로에서 재검 (데스크톱 우선, 모바일 시뮬레이터).
- rustra 쪽: 추가한 이벤트 푸시/async 우회에 단위 테스트 + 계약 게이트(`@rustra/testing`).
- 전환 기준: "기존 브릿지 삭제 후에도 전 기능 스모크 통과".

## 리스크

| 리스크 | 완화 |
|---|---|
| rustra pre-1.0 API 변동 | 버전 고정(pin) + 변경 시 마이그레이션 노트 |
| RN 네이티브 모듈 구축 공수 (TS 절반만 배포됨) | 예제 코드 이식 + rustra 문서 개선 산출물로 |
| async 미지원으로 인한 스레드 폭증 | 작업 큐/전용 스레드 풀 패턴으로 제한 |
| 1MB 상한 도달 (임베딩·대형 배치) | 3주차에 실측 후 상향 또는 청킹 |
| 모바일 전환 중 기능 정지 | 교살자 패턴 — Nitro 경로를 끝까지 유지 |
