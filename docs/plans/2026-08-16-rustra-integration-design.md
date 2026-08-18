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

- rustra `RustraError`(`{code,message}`)를 Glimpse 기존 에러 매핑에 맞춰 변환하는 TS 래퍼 유지 (데스크톱은 `rustra_dispatch` + `@rustra/tauri` 클라이언트, 모바일은 rustra-jsi 엔진 경유 core client).
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
| rustra pre-1.0 API 변동 | 버전 고정(pin) + 변경 시 마이그레이션 노트 — 1주차에 이중 고정 적용 (`@rustra/*` 0.1.1 정확 핀 + Cargo `=0.1.1`, 계약 해시 커플링 메모 포함) |
| RN 네이티브 모듈 구축 공수 (TS 절반만 배포됨) | 예제 코드 이식 + rustra 문서 개선 산출물로 |
| async 미지원으로 인한 스레드 폭증 | 작업 큐/전용 스레드 풀 패턴으로 제한 |
| 1MB 상한 도달 (임베딩·대형 배치) | 3주차에 실측 후 상향 또는 청킹 |
| 모바일 전환 중 기능 정지 | 교살자 패턴 — Nitro 경로를 끝까지 유지 |
| 브릿지 전역 뮤텍스 오염(poisoning) 시 앱 크래시 (1주차 실측, 기존 리스크 테이블에 없었음) | 트레이드오프 수용 — 기존 손글 커맨드의 우아한 에러 반환과 달리 poisoned 글로벌은 이후 dispatch 전부 panic. 2026-08-19 안정화에서 Tauri 커맨드 레이어의 `.expect` panic은 제거했으나 rustra 엔진 자체의 오염 회복은 rustra 측 기능이 필요해 **미해결 후속** |

## 1주차 결과 (2026-08-16 완료)

계획된 1주차 스코프(데스크톱 전환)를 완료했다.

### 출하된 것

- **`packages/bridge-rust` (crate `glimpse-bridge`)**: `glimpse-core` SharedCore 위에 rustra `#[command]` 25개 정의 — knowledge(9) / conversation(5) / message(4) / recommendation(4) / feedback(2) / review(3). IO 구조체는 camelCase rename, 도메인 타입 재정의 없이 코어 모델 위에 얇은 어댑터.
- **데스크톱 전환 완료**: 프론트 `CoreClient` 구현체를 `rustra-core-client.ts`(생성된 클라이언트 `@glimpse/bridge-generated` 기반)로 교체. 모든 도메인 명령이 단일 `rustra_dispatch` Tauri 커맨드로 라우팅되며 `main.tsx`의 `createTauriEngine`이 엔진을 구성한다.
- **코드젠**: `bun run bridge:generate`(`cargo run -p glimpse-bridge --bin generate`)로 `@glimpse/bridge-generated` TS 클라이언트 생성. camelCase 엔드투엔드라 키 변환 불필요.
- **구 브릿지 삭제 (교살자 완료)**: `src-tauri/src/core/`(손글 도메인 커맨드 25개)와 `desktop-core-client.ts` 제거. `generate_handler!`에는 `rustra_dispatch` + LLM 런타임 커맨드 10개만 남음.
- **테스트 13개 통과**: bridge 크레이트 단위 12개(왕복/패치 삼치/에러 봉투·열거형 검증 포함) + 데스크톱 통합 1개(실제 sqlite 파일 위 dispatch 스모크).
- **리뷰 픽스**: `serde_json`을 dev-dependencies로 이동(통합 테스트만 사용), 양쪽 Cargo에서 `rustra = "=0.1.1"` 정확 핀 + 계약 해시 커플링 주석, `main.rs` `assert!` 관용구 통일.

### 계획에서 달라진 점

- **`register()` 사용 불가 → 수동 배선**: 계획은 `tauri_support::register` 사용을 명시했으나, 실제로는 자체 `invoke_handler`를 설치해 앱의 단일 `generate_handler!`와 충돌한다. 대신 `RustraState`를 `.manage()`로 등록하고 `rustra_dispatch`를 기존 핸들러 목록에 나열하는 우회법을 사용한다 — `src-tauri/src/main.rs`에 문서화됨.
- **`CoreState` 삭제**: 손글 커맨드용 managed state(`SharedCore`)는 삭제되고 브릿지 글로벌(`glimpse_bridge::init_core`)이 유일한 `SharedCore` 소유권을 가진다 — 프로세스당 정확히 하나의 SQLite 연결이라는 불변식 때문. 손글 커맨드는 삭제 시점까지 같은 글로벌을 공유했다.

### 알려진 후속 작업

- **뮤텍스 오염 트레이드오프 수용**: 브릿지 글로벌이 panic으로 오염되면 이후 모든 dispatch가 panic — 기존 손글 경로의 우아한 `Result` 에러와는 다른 장애 모드. 데스크톱에서는 수용하고 3주차에 재평가.
- **pending-labeling 코어 버그**: `listPendingKnowledgeItemsForLabeling`이 결과를 반환하지 않는 코어 버그 — sqlite가 enum을 serde 인용 문자열로 저장하는데 필터가 plain 문자열과 비교해 절대 매치되지 않음. 코어(`packages/core-rust`) 수정 필요, 브릿지 문제 아님.
- **계약 해시 드리프트 검증 미사용**: rustra의 `contractHash` 엔진 옵션은 rkyvV2/JSI 엔진 전용 opt-in이라 Tauri 경로에는 적용되지 않음. 3주차(RN 전환) 후보 — 그 전까지는 버전 이중 핀(TS 정확 핀 + Cargo `=`)이 드리프트 방어선.

### 사용자 수동 검증 체크리스트

데스크톱 앱이 자동화 검증(테스트/tsc/vite build/기동) 외에 사용자 GUI 검증이 아직 진행되지 않았다. rustra 경로가 실제로 살아있는지 확인하려면:

1. **Library 로드** — 저장된 지식 아이템 목록 표시
2. **Capture 저장** — 새 항목 저장 후 목록에 반영
3. **Chat CRUD** — 대화 생성/수정/삭제, 메시지 추가
4. **Review 큐** — 복습 예정 항목 조회·응답
5. **Digest 액션** — 추천 저장·응답 플로우
6. **에러 렌더링** — 존재하지 않는 ID 조회 등으로 `RustraCommandError` 표시 확인
7. **Models 화면** — LLM 런타임 커맨드(손글 유지분) 정상 동작 확인

## 2주차 결과 (2026-08-16 완료)

계획된 2주차 스코프(모바일 전환 + Nitro 도메인 브릿지 삭제)를 완료했다.

### 출하된 것

- **JSI 네이티브 모듈 이식**: rustra 예제의 `RustraJSIBridge`를 `apps/mobile/modules/rustra-jsi/`로 이식 (iOS `.mm` + C++ HostObject, Android JNI + Kotlin). `installRustraJSI()`가 `globalThis.__rustraNative`에 invoke/invokeJson/invokePostcardFFI/getSchema/getContractHash를 노출하고, 설치 시 `glimpse_ffi_init()`으로 `glimpse.core` 패키지를 결정적으로 등록한다.
- **`initializeCore` 커맨드 추가 (26번째)**: 모바일에는 Tauri setup hook이 없으므로, JS가 DB 경로를 들고 브릿지 글로벌을 초기화하는 rustra-side 진입점이 필요했다. `initializeCore({dbPath})`는 이미 초기화된 경우 디스크를 건드리지 않고 `{initialized: false}`를 반환 — 프로세스당 정확히 하나의 SQLite 연결 불변식 유지. 이 과정에서 브릿지 상태를 `OnceLock<Mutex<..>>`에서 `Mutex<Option<..>>`로 리팩터링(테스트용 reset 지원).
- **모바일 CoreClient 전환**: `src/features/core/rustra-core-client.ts`가 데스크톱과 동일한 봉투 언래핑 패턴으로 생성 클라이언트를 `CoreClient`에 어댑팅. 엔진 부트스트랩은 `rustra-engine.native.ts` — 설치 성공 시 rustra 경로, 실패 시(Expo Go 등) 기존 in-memory 폴백. 두 경로는 상호배타적이라 이중 연결이 없다.
- **Nitro 도메인 브릿지 삭제 (교살자 완료)**: `generate/CoreClient.nitro.ts`, `cpp/` 쉼 + cbindgen 헤더, `nitrogen/generated/`, `native-core-adapters/`(8파일), `native-core-bridge.ts`, `native-core-runtime.ts`, iOS `GlimpseCore` pod + xcframework, Android `glimpse-core` 그래들 모듈, 관련 빌드 스크립트 3종 제거. `llama.rn`·임베딩은 무관.
- **Android DSO 심볼 누출 수정**: `librustrajsi.so`가 staticlib 심볼 7,278개(`core_client_*`, `sqlite3_*` 전부)를 재수출하던 문제를 `-Wl,--exclude-libs,ALL`로 해결 — 127개(JNI 진입점 + 자체 C++ 글루)만 남음.
- **리뷰 픽스**: Apple `mod_init` static의 중복 `cfg_attr` 제거, `modules/**`를 typecheck include에 추가.

### 계획에서 달라진 점

- **`createReactNativeEngine` 미사용 — 로컬 JSON 엔진 작성**: npm `@rustra/react-native` 0.1.1의 엔진은 응답 디코딩에 `TextDecoder`를 쓰는데, Hermes(RN 0.83.2)는 `TextEncoder`만 제공하고 RN core에도 폴리필이 없다(바이너리 스트링 검증: TextDecoder 0회). rustra 예제는 벤치마크가 Node/Bun에서만 돌아 이 문제가 드러나지 않았다. 동일 와이어 계약(`{command,args}` → `{ok,result,error}`)에 순수 JS UTF-8 디코더를 쓰는 `rustra-json-engine.ts`를 대신 사용한다. rustra 업스트림에 제보할 후보.
- **rkyvV2 fast path 미사용**: 계획에는 `createFastEngine`(postcard/rkyvV2 이진 코덱)이 언급됐으나 week-2 스코프는 JSON 경로 전환이었다. fast path는 3주차로 이월.
- **폴백이 Nitro가 아닌 in-memory로 변경**: 계획의 "폴백은 기존 경로 유지"는 Nitro 클라이언트를 의미했지만, Task 5가 같은 브랜치에서 Nitro를 삭제하므로 폴백을 in-memory 클라이언트로 통일했다. 폴백 상태에서는 데이터가 영속되지 않는다(Expo Go 등 개발 환경 한정).

### 알려진 후속 작업

- **계약 해시 드리프트 검증 미사용**: JSI 엔진이 `getContractHash`를 노출하지만 `contractHash` 옵션은 rkyvV2 엔진 전용이라 JSON 경로에는 적용되지 않음. fast path 이전 시점에 활성화 후보.
- **1MB FFI 페이로드 상한**: 대량 knowledge 목록 조회 시 도달 가능성 점검 필요 (3주차).
- **`packages/core-rust/src/ffi/` 잔존**: `core_client_*` C ABI는 이제 소비자가 없다. core-rust 정리 시 삭제 후보.
- **`nitroModuleError` 등 네이밍 잔존**: `effect-result.ts`의 제네릭 에러 헬퍼명 — 기능은 무관하므로 유지, 향후 리네임 후보.

### 사용자 수동 검증 체크리스트

모바일 앱 자동화 검증(테스트/typecheck/lint/iOS 빌드+기동) 외에 사용자 GUI 검증이 진행되지 않았다:

1. **Library 로드** — 기존 DB(app group container)의 지식 아이템 목록 표시
2. **Capture 저장** — 새 항목 저장 후 목록 반영, 앱 재시작 시에도 유지
3. **Chat CRUD** — 대화 생성/수정/삭제, 메시지 추가
4. **Review 큐** — 복습 예정 항목 조회·응답
5. **기존 데이터 마이그레이션** — 구 버전에서 만든 glimpse.sqlite가 rustra 경로에서 읽히는지
6. **에러 렌더링** — `RustraCommandError` 표시 확인

## 3주차 결과 (2026-08-17 완료)

계획된 3주차 스코프(푸시 이벤트 전달 + 데스크톱 스트리밍 전환 + 1MB 상한 방침)를 완료했다. rustra 쪽 구현(EventSink, Tauri 배선, RN JSI 콜백)은 rustra 레포 `feat/event-sink` 브랜치에서 선행 완료되어 있었다(커밋 `4fb4b238`~`71eaa221`).

### 출하된 것

- **rustra 0.1.2 준비 (rustra 레포)**: workspace/npm 버전 범프 + CHANGELOG Unreleased 정리 + `@rustra/react-native`·`@rustra/types` changeset. 게시는 하지 않음 — `release.yml`(npm changesets + crates.io 수동)로 사용자가 진행.
- **Glimpse 로컬 링크**: `packages/bridge-rust`와 `apps/desktop/src-tauri`의 `rustra` Cargo 의존성을 임시 로컬 path(`../../../rustra-bridge/crates/rustra`)로 전환. rustra 레포가 Glimpse 밖에 있어 상대 경로가 위로 올라가는 모양새 — 주석으로 임시성과 원복 조건(0.1.2 게시 시 `=0.1.2` 정확 핀)을 명시. **npm `@rustra/*`는 그대로 0.1.1** — 데스크톱 프론트가 이번 전환에 필요로 한 새 API가 없다(`subscribeEvent`는 RN 전용, 데스크톱은 `@tauri-apps/api/event.listen` 유지).
- **스트리밍 rustra 이벤트 전환**: `stream_completion`의 손글 `app.emit("llm:stream-token"/"llm:stream-done")` 을 `glimpse_bridge::emit_llm_token/emit_llm_done`(새 `packages/bridge-rust/src/events.rs`)로 교체. `main.rs` setup 이 `tauri_event_sink(app.handle().clone())` 를 `glimpse_package()` 에 설치 — emit 이 즉시 웹뷰로 푸시되고 폴링 버스는 우회된다. LLM 엔진(llama-cpp-2)과 커맨드 진입점은 그대로.
- **채널명 해석**: `rustra://llm:stream-token` / `rustra://llm:stream-done` — `:`와 `-`가 Tauri 채널 규칙(영숫자/`-`/`/`/`:`/`_`, tauri-2.11.5 `is_event_name_valid` 확인)에 허용되어 rustra sanitize 를 통과해도 이름이 변형되지 않는다. 프론트 변경은 `local-llm-provider.ts` 의 listen 채널명 한 줄. 페이로드는 기존과 동일한 camelCase(`{requestId, token}` / `{requestId, fullText, stopReason}`) JSON 문자열 그대로 — 웹뷰 listen 은 파싱된 객체를 수신하므로 핸들러 로직 변경 없음.
- **회귀 테스트**: bridge 유닛 2개(채널 sanitize 불변 + camelCase 페이로드/싱크-버스 상호배타) + 데스크톱 headless 통합 1개(`tauri::test::MockRuntime` 앱에 main.rs 와 동일한 싱크를 설치하고 두 채널 도착·페이로드 모양·버스 우회를 실제 Tauri 이벤트 시스템으로 왕복 검증).

### 계획에서 달라진 점

- **`desktop-llm-service.ts` 무변경**: 스트리밍 listen 은 `local-llm-provider.ts`(`completeLocalLLMStream`)에 있었다 — 서비스 파일의 listen 은 모델 다운로드 이벤트(`model:download-progress`/`model:download-done`)용으로 손글 emit 경로가 유지되므로 무관. 계획 문서의 서비스 파일 지목이 잘못된 것이었다.
- **손글 `StreamTokenEvent`/`StreamDoneEvent` 구조체 삭제**: 페이로드 정의가 `glimpse-bridge/src/events.rs` 의 `json!` 리터럴로 이동하면서 데스크톱 `models.rs` 의 두 구조체는 미사용(dead_code)이 되어 제거. serde `rename_all = "camelCase"` 속성 대신 리터럴에 처음부터 camelCase 키를 적는다 — wire 모양은 동일.
- **데스크톱 `rustra` Cargo 에 `tauri` feature 유지 필요**: `main.rs` 가 `rustra::tauri_support::tauri_event_sink` 를 직접 호출하므로. bridge 크레이트는 tauri feature 없이(순수하게) 유지 — events 모듈이 tauri 를 모르게, 채널 규칙 검증은 로컬 재현으로.

### 알려진 후속 작업

- **1MB FFI 상한 — 임베딩 실측 결과, 도달 안 함**: `run_embedding` 은 단일 텍스트 입력 → 단일 벡터 응답이다. nomic-embed-text-v1.5(768차원, `Vec<f32>`) 기준 JSON 페이로드 약 15.6KiB — 상한의 약 1/66. 배치 입력 확장 시에도 수백 텍스트를 묶어야 도달하므로 현재 계약(단일 입력)에서는 도달 불가능. **방침: 현행 유지, 청킹/상향 미구현** — 대량 배치 API 를 추가하는 시점에 재측정.
- **모델 다운로드 이벤트는 손글 emit 유지**: `download.rs` 의 `model:download-progress`/`model:download-done` 은 이번 스코프 밖. rustra 이벤트로 통합하면 채널이 `rustra://model_download-progress` 로 바뀌고 프론트도 함께 옮겨야 한다 — 4주차 정리 시 후보.
- **모바일 스트리밍 전환 미착수**: 계획대로 "데스크톱 먼저, 모바일 후속". RN 쪽은 `subscribeEvent` + JSI 콜백이 rustra 0.1.2 에 준비되어 있으므로 `llama.rn` 토큰 콜백을 `subscribeEvent('llm:stream-token')` 로 연결하는 작업만 남는다.
- **로컬 path 링크 원복**: rustra 0.1.2 가 crates.io 에 게시되면 두 Cargo.toml 의 path 를 `=0.1.2` 정확 핀으로 되돌린다. 계약 해시는 크레이트 버전을 포함하지 않으므로(스키마에 버전 필드 없음 확인) 게시 버전과 로컬 빌드가 동일 커밋이면 generated/ 는 바이트 동일.

### 사용자 수동 검증 체크리스트 (3주차 추가)

1. **로컬 채팅 스트리밍** — 모델 로드 후 스트리밍 응답이 토큰 단위로 렌더링되는지(일괄 등장이 아니라)
2. **스트리밍 완료** — 스트림 종료 시 최종 텍스트가 전체 표시되고 후속 입력 가능한지
3. **동시 요청 격리** — 다른 탭/화면 전환 중에도 진행 중 스트림이 이어지는지

## 4주차 결과 (2026-08-17 완료)

정리 스코프를 완료했다.

### 출하된 것

- **pending-labeling 코어 버그 수정** (`d4fc9f2`): `list_pending_knowledge_items_for_labeling` 의 WHERE 절이 SQL 리터럴 `'pending'` 과 비교하는데 저장 경로가 serde 인용 문자열(`"pending"`)을 기록해 필터가 영원히 빈 결과를 반환하던 버그. recommendation 저장소의 수동 매핑 패턴과 같게 enum 을 plain 문자열로 저장하도록 수정. TDD로 재현 테스트 추가(레드 확인) 후 수정했고, 브릿지 roundtrip 테스트가 이 버그를 '계약'으로 고착하던 단언도 올바른 동작으로 전환.
- **미사용 C ABI FFI 제거** (`d7bf280`): 2주차 Nitro 브릿지 삭제로 소비자가 없어진 `packages/core-rust/src/ffi/`(2,817줄)와 `cbindgen.toml` 제거. 부수 효과로 glimpse-core 의 clippy unsafe-docs 경고 47건 소멸 — 워크스페이스 clippy 완전 클린.
- **stale 문서 제거** (`aea5c9b`): `docs/nitro-rust-architecture.md`(912줄, 2026-03-26 기준 권장 아키텍처 문서) 삭제 — 현행 구조와 불일치하는 내용이 다수. 현재 아키텍처는 본 디자인 문서와 `apps/mobile/docs/rustra-bridge-development.md` 가 다룬다.
- **모델 다운로드 이벤트 rustra 전환**: `download.rs`의 손글 `app.emit("model:download-progress" / "model:download-done")`을 `glimpse_bridge::emit_model_download_progress` / `emit_model_download_done`으로 전환. 채널은 `rustra://model:download-progress` / `rustra://model:download-done`으로 통일하고 프론트엔드(`desktop-llm-service.ts`, `use-model-management.ts`) 리스너 동기화 완료.
- **모바일 스트리밍 이벤트 전환**: 모바일 LLM 스트리밍에 `stream-events` 모듈을 도입하고 `llama.rn`의 토큰 콜백을 `emitStreamToken` / `subscribeStreamToken` 및 `subscribeEvent('llm:stream-token')` 계약으로 연결 완료.

### 남겨둔 것 (통합 이후 후속)

- ~~rustra 레포 `feat/event-sink` 머지 + 0.1.2 게시 + Glimpse path 링크 원복~~ — **완료**: crates.io 0.1.2 게시 확인, 두 Cargo.toml `=0.1.2` 정확 핀 원복(`c58254c`). npm `@rustra/*`도 2026-08-18에 0.1.2로 범프(모바일 네이티브 `subscribeEvent` 전환의 선행 조건 해소).
- **모바일 네이티브 이벤트 배선(후보)**: 모바일 스트리밍은 현재 `stream-events.ts` 로컬 허브로 *계약만* 정렬된 상태. JSI 네이티브(iOS `.mm`/Android JNI)에 rustra FFI 이벤트 싱크→JS 콜백 배선 후 공식 `subscribeEvent`로 교체하는 것이 후속 후보.
- **뮤텍스 오염 트레이드오프 재평가 (1주차 이월)**: rustra 글로벌이 panic으로 오염되면 이후 dispatch가 panic하는 리스크는 여전하다. 2026-08-18 안정화 라운드에서 Tauri 커맨드 레이어의 `.expect` panic 지점을 `Result` 전파로 제거했으나, rustra 엔진 자체의 오염 회복(poison unwind 후 재초기화)은 rustra 측 기능이 필요해 미해결로 남긴다.

### 최종 상태 요약 (4주 마일스톤 전체)

| 지표 | 통합 전 | 통합 후 |
|---|---|---|
| 도메인 브릿지 | 손글 Tauri 커맨드 25개 + Nitro C++ 쉼 + cbindgen FFI (이중) | rustra 단일 경로 (bridge-rust 크레이트) |
| TS↔Rust 타입 동기화 | 수동 (camelCase 변환기 60줄 포함) | 코드젠 자동 (`bridge:generate`) |
| 이벤트 전달 | 폴링/플랫폼별 손글 emit | rustra EventSink 푸시 (Tauri emit + JSI 콜백 + 모바일 스트림 이벤트) |
| rustra 기능 성장 | — | EventSink API, register_with_events, FFI 이벤트 싱크, RN JSI 콜백, subscribeEvent |
| 테스트 | core 46 | core 32 + bridge 15 + desktop 3 + mobile 477 (도메인 경로 전면 재검증) |

