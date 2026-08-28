# mDNS 로컬 동기화 수리 + rustra 0.4.0 + 공유 Rust 통합 설계

- 날짜: 2026-08-28
- 상태: 승인됨 (Goal 1 → 2 → 3 순서 진행)
- 테스트 환경 제약: Desktop(macOS) + iOS 시뮬레이터만. Android는 다른 작업에 사용 중.
- 연관 문서: `docs/desktop-mobile-sync.md`, `docs/plans/2026-08-16-rustra-integration-design.md`, `apps/mobile/docs/rustra-bridge-development.md`

## 배경

mDNS 발견 → 페어링 → LAN 동기화 인프라는 이미 존재한다:

- Desktop(Tauri/Rust): `mdns-sd` 광고(`_glimpse-sync._tcp`) + axum 서버(포트 34129). `apps/desktop/src-tauri/src/sync/mod.rs`
- Mobile: Bonjour(iOS)/NSD(Android) 네이티브 discovery 모듈 + TS fetch 동기화. `apps/mobile/src/features/sync/sync-client.ts`
- 자동 동기화: 앱 활성 중 60초 주기 + resume(`useAutoSync.ts`), OS 백그라운드 태스크(최소 15분, `background-task.ts`)
- 권한: iOS `NSLocalNetworkUsageDescription`/`NSBonjourServices`, Android multicast lock 설정 완료

병합 로직은 이미 데스크톱·모바일이 같은 `core-rust` 크레이트(`merge_data`, `max_merge_clock`, `fingerprint_of_snapshot`)를 공유한다. 차이는 전송/발견 계층: 데스크톱은 Rust(axum + mdns-sd), 모바일은 Swift/Kotlin discovery + TS fetch다.

## Goal 1 — 동기화 루프 수리 (Desktop + iOS 시뮬레이터)

**완료 기준:** Desktop 실행 + iOS 시뮬레이터에서 ① mDNS 발견 → ② 페어링 → ③ 수동 동기화 → ④ 60초 자동 동기화 → ⑤ resume 동기화 통과.

### 수리 항목

1. **iOS discovery IP 주소 사용** — `SyncDiscoveryModule.swift`가 hostname(`glimpse-xxx.local`)만 반환해 시뮬레이터/실기기에서 A-record 재해석이 실패할 수 있다. resolve된 `sender.addresses`의 IP를 우선 반환하도록 수정.
2. **네이티브 모듈 부재 시 조용한 `[]` 제거** — `sync-discovery/src/index.ts`가 모듈 부재 시 빈 배열을 반환해 "발견 안 됨"과 "모듈 없음"이 구분되지 않는다. 명확한 상태/오류로 노출.
3. **Desktop startup_error 가시화** — 포트 바인딩 실패, mDNS 광고 실패 등 `startup_error`를 설정 화면에 표시.
4. **검증 절차 문서화** — `dns-sd -B _glimpse-sync._tcp` 광고 확인 → 시뮬레이터 발견 → macOS 방화벽 허용 절차.

### 에러 처리

발견 실패 / 빈 결과 / 모듈 없음 / 타임아웃을 서로 다른 런타임 상태로 구분한다.

### 테스트

- 기존 단위 테스트 유지(`sync-url.test.ts`, `backoff.test.ts` 등).
- 시뮬레이터 수동 E2E 게이트가 완료 기준.
- **OS 백그라운드 태스크(BGTaskScheduler)는 시뮬레이터 검증 불가** — 실기기 잔여 과제로 명시한다.

## Goal 2 — rustra 0.4.0 업그레이드 (동일 로직 강화)

현재 `rustra = "=0.1.3"` 정확 핀(Rust) + `@rustra/*` 0.1.3(TS). 최신은 0.4.0(2026-08-24 lockstep). 0.2→0.4는 마이너 표기지만 FFI/JSI 계약 변화가 있다.

### 작업 항목

1. Cargo 핀 `=0.4.0`, `@rustra/types`·`@rustra/tauri`·`@rustra/react-native` 전부 0.4.0 lockstep 갱신.
2. **JSI C++ 정렬** — `RustraJSIBridge.cpp`를 통합 FFI 심볼(`rustra_ffi_invoke_rkyv_v2[_into][_async]`, caller-buffer 경로)로 전환. `getContractHash` 노출로 RN에서 `contractHash` 엔진 옵션 활성화.
3. **이벤트 네이티브화** — 모바일 `stream-events.ts` 로컬 허브를 JSI `onEvent` 기반 구독으로 전환(기존 후속 과제). 데스크톱은 `@rustra/tauri`의 `subscribeEvent`/`rustraEventChannel` 채택.
4. `bun run bridge:generate` 재생성 — 0.3.0+ codegen 산출물(`events.ts`, `commandId` 식별, `invokeTypedById` 페이사드) 반영.
5. **게이트:** `expectContractCurrent` 계약 게이트, `cargo test`, `bun test`, `bun run lint`, 데스크톱 e2e. 시뮬레이터에서 LLM 스트리밍/모델 다운로드 진행 이벤트 실동작 확인.

### 주의 사항 (릴리스 노트 기반)

- 0.2.0: `getLiveSchema`가 `getSchema` 없는 네이티브에서 `schema.unavailable` throw. Lynx 제거(영향 없음).
- 0.3.0: 비동기 invoke가 고정 풀(2 worker / 256 queue)로 전환 — 포화 시 `invoke.backpressure` 즉시 거절. `grant_capability` 릴리스 빌드 동작 복구.
- 0.4.0: lazy zero-config bootstrap — 엔트리 진입점 변경 확인 필요.
- lockstep: `@rustra/*`는 전부 함께 올린다.

## Goal 3 — 동기화 로직 공유 Rust 통합

**현실 제약:** `mdns-sd`(raw UDP 멀티캐스트)를 iOS에서 그대로 쓰려면 Apple multicast entitlement가 필요하다. Android NSD는 Java API다. 따라서 완전 통일이 아니라 **로직 공유 + 플랫폼 백엔드 분리**로 설계한다.

### 작업 항목

1. `bridge-rust`에 sync 엔진 커맨드 추가:
   - `sync_discover(timeout_ms)` — discovery 트레잇 뒤에 백엔드: desktop=`mdns-sd`, iOS=dnssd(Bonjour C API — entitlement 불필요), **Android=Rust→JNI→NsdManager 직접 호출**.
   - `sync_plan(config, candidates)` — 엔드포인트 우선순위·재시도/백오프·워터마크 사용 판단을 Rust로 이동. 데스크톱 서버(`server.rs`)와 같은 크레이트 로직으로 병합/워터마크/발견 파라미터 계산.
2. HTTP 전송 자체는 JS fetch 유지 — 토큰 보안(redirect 차단), gzip 계약, 타임아웃이 이미 JS에 안착.
3. TS는 얇은 어댑터만 남기고 판단 로직 제거.

### 테스트

- 백엔드별 cargo 테스트(desktop 실제 실행, iOS는 cfg 게이트).
- 어댑터 bun 단위 테스트.
- 시뮬레이터에서 발견→페어링→동기화 재검증.

## 잔여·명시적 범위 외

- OS 백그라운드 태스크 실기기 검증(시뮬레이터 불가).
- Android 실기기 검증(테스트 환경 점유 중).
- Tailscale 원격 동기화는 이번 설계 범위 밖(기존 동작 유지).
