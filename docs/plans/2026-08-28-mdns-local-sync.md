# mDNS 로컬 동기화 수리 + rustra 0.4.0 + 공유 Rust 통합 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Desktop + iOS 시뮬레이터에서 mDNS 발견→페어링→자동 동기화 루프를 수리하고, rustra 0.4.0으로 올려 FFI/이벤트 계약을 정렬한 뒤, sync 판단 로직을 공유 Rust로 이동한다.

**Architecture:** 3개의 독립 Goal을 순서대로 수행한다. Goal 1은 기존 Swift/Kotlin discovery + TS fetch 경로의 결함 수리(테스트 환경: macOS Desktop + iOS 시뮬레이터). Goal 2는 `rustra = "=0.1.3"` → `=0.4.0` lockstep 업그레이드 + JSI C++ 심볼 정렬 + 이벤트 네이티브화. Goal 3은 `bridge-rust`에 sync 엔진 커맨드(`sync_discover`, `sync_plan`)를 추가해 판단 로직을 데스크톱과 동일한 `core-rust`/`bridge-rust` 크레이트로 이동한다(Android는 Rust→JNI→NsdManager 직접 호출).

**Tech Stack:** Rust (mdns-sd, axum, rustra 0.4.0), Tauri, Expo/React Native (expo-modules-core, JSI), Swift NetService/dnssd, Kotlin NsdManager/JNI, Bun test.

**설계 문서:** `docs/plans/2026-08-28-mdns-local-sync-design.md`

**검증 환경 제약:** Desktop(macOS) + iOS 시뮬레이터만 사용. Android 실기기는 다른 작업 점유 중 → Goal 3의 Android JNI 백엔드는 컴파일 게이트만 통과시키고 실기기 검증은 잔여 과제로 남긴다. iOS BGTaskScheduler 백그라운드 태스크는 시뮬레이터 검증 불가 → 실기기 잔여 과제.

---

## Goal 1 — 동기화 루프 수리

### Task 1.1: iOS discovery가 resolve된 IP를 반환하도록 수정

**Files:**
- Modify: `apps/mobile/modules/sync-discovery/ios/SyncDiscoveryModule.swift:68-84`
- Test: 수동 시뮬레이터 검증 (네이티브 코드 — 단위 테스트 불가)

**Step 1: 구현**

`netServiceDidResolveAddress`에서 hostname 대신 resolve된 주소를 우선 반환한다. `sender.addresses`는 `Data`(sockaddr) 배열이므로 `getnameinfo`로 IP 문자열을 뽑는다. IPv4를 우선하고, 주소가 없으면 기존처럼 hostname으로 폴백한다.

```swift
func netServiceDidResolveAddress(_ sender: NetService) {
  guard sender.port > 0 else { return }
  let txt = NetService.dictionary(fromTXTRecord: sender.txtRecordData() ?? Data())
  let deviceId = txt["deviceId"].flatMap { String(data: $0, encoding: .utf8) }
  let protocolVersion = txt["protocol"]
    .flatMap { String(data: $0, encoding: .utf8) }
    .flatMap(Int.init) ?? 1
  let host = Self.primaryAddress(of: sender)
    ?? sender.hostName?.trimmingCharacters(in: CharacterSet(charactersIn: "."))
  guard let host, !host.isEmpty else { return }
  let key = deviceId ?? "\(host):\(sender.port)"
  results[key] = [
    "name": sender.name,
    "host": host,
    "port": sender.port,
    "deviceId": deviceId,
    "protocolVersion": protocolVersion,
  ]
}

/// IPv4 주소를 우선 반환한다. 시뮬레이터·실기기 모두 mDNS hostname의
/// A-record 재해석 없이 바로 접속 가능한 숫자 IP가 가장 믿을 만하다.
private static func primaryAddress(of service: NetService) -> String? {
  let addresses = (service.addresses ?? []).compactMap { data -> String? in
    (data as NSData).withUnsafeBytes { (raw: UnsafeRawBufferPointer) -> String? in
      guard let base = raw.baseAddress else { return nil }
      let sockaddr = base.assumingMemoryBound(to: sockaddr.self).pointee
      if sockaddr.sa_family == sa_family_t(AF_INET) {
        return data.withUnsafeBytes { raw in
          var addr = raw.load(as: sockaddr_in.self)
          var buffer = [CChar](repeating: 0, count: Int(INET_ADDRSTRLEN))
          guard inet_ntop(AF_INET, &addr.sin_addr, &buffer, socklen_t(INET_ADDRSTRLEN)) != nil
          else { return nil }
          return String(cString: buffer)
        }
      }
      return nil
    }
  }
  return addresses.first
}
```

**Step 2: 빌드 확인**

Run: `cd /Users/loopy/dev/ll3/Glimpse/apps/mobile && bun run ios 2>&1 | tail -20` (시뮬레이터 빌드)
Expected: 빌드 성공. Swift 컴파일 에러 없음.

**Step 3: 커밋**

```bash
git add apps/mobile/modules/sync-discovery/ios/SyncDiscoveryModule.swift
git commit -m "fix(mobile): mDNS discovery가 resolve된 IP를 반환하도록 수정"
```

### Task 1.2: discovery 모듈 부재 시 조용한 [] 대신 명시적 상태 노출

**Files:**
- Modify: `apps/mobile/modules/sync-discovery/src/index.ts`
- Modify: `apps/mobile/src/features/sync/sync-client.ts:73-85` (discoverDesktops)
- Test: `apps/mobile/src/features/sync/sync-client.discovery.test.ts` (신규)

**Step 1: 실패하는 테스트 작성**

모듈이 없으면 `discoverDesktops()`가 오류를 던지고, 런타임 상태가 `unavailable`이 되는지 검증:

```typescript
// apps/mobile/src/features/sync/sync-client.discovery.test.ts
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const discoverMock = mock(async () => [] as never[]);

mock.module('../../../modules/sync-discovery/src', () => ({
  discoverSyncDesktops: discoverMock,
  isSyncDiscoveryAvailable: () => false,
  discoveryUnavailableError: '이 기기에서는 Desktop 탐색을 사용할 수 없습니다.',
}));

// sync-store/sync-client는 RN import가 없는 경로만 쓰도록 이미 정리되어 있어야 한다.
// index.ts 재수출 경로가 RN 의존을 끌면 개별 모듈을 직접 import한다.
import { discoverDesktops } from './sync-client';
import { getSyncStoreState } from './sync-store-test-helpers';

describe('discoverDesktops', () => {
  beforeEach(() => {
    discoverMock.mockClear();
  });

  it('모듈이 없으면 unavailable 오류를 던진다', async () => {
    await expect(discoverDesktops()).rejects.toThrow('사용할 수 없');
    expect(getSyncStoreState().runtime.status).toBe('unavailable');
  });
});
```

참고: 이 테스트를 작성하며 기존 모듈 경로(`modules/sync-discovery/src`)가 bun에서 require 가능한지 확인하고, RN 전용 import가 있으면 테스트용 mock으로만 우회한다.

**Step 2: 테스트 실행 후 실패 확인**

Run: `cd /Users/loopy/dev/ll3/Glimpse/apps/mobile && bun test src/features/sync/sync-client.discovery.test.ts`
Expected: FAIL — 현재는 모듈 부재 시 `[]`를 반환하므로.

**Step 3: 구현**

`modules/sync-discovery/src/index.ts`:

```typescript
import { requireOptionalNativeModule } from 'expo-modules-core';

export type DiscoveredSyncDesktop = { /* 기존 유지 */ };

type SyncDiscoveryNativeModule = {
  discover(timeoutMs: number): Promise<DiscoveredSyncDesktop[]>;
};

const nativeModule = requireOptionalNativeModule<SyncDiscoveryNativeModule>(
  'GlimpseSyncDiscovery',
);

export function isSyncDiscoveryAvailable(): boolean {
  return nativeModule !== null;
}

export const discoveryUnavailableError = '이 기기에서는 Desktop 탐색을 사용할 수 없습니다.';

export async function discoverSyncDesktops(
  timeoutMs: number = 2_500,
): Promise<DiscoveredSyncDesktop[]> {
  if (!nativeModule) {
    throw new Error(discoveryUnavailableError);
  }
  return nativeModule.discover(Math.min(Math.max(timeoutMs, 500), 10_000));
}
```

`sync-client.ts`의 `discoverDesktops`는 `runtime` 상태로 구분된 오류를 전파하도록 유지(이미 setSyncRuntime('error') 경로가 있음)하고, `rediscoverPairedDesktop`의 조용한 catch는 유지하되 백그라운드 자동 동기화가 무한 재시도하지 않도록 `unavailable` 오류는 재발견 시도에서 제외한다.

`types.ts`의 `SyncRuntimeStatus`에 `'unavailable'` 추가, `DesktopSyncSection.tsx`의 `busy` 계산은 그대로(unavailable은 busy 아님).

**Step 4: 테스트 통과 확인**

Run: `bun test src/features/sync/`
Expected: PASS (기존 sync 테스트 포함)

**Step 5: 커밋**

```bash
git add apps/mobile/modules/sync-discovery/src/index.ts apps/mobile/src/features/sync/
git commit -m "feat(mobile): discovery 모듈 부재를 명시적 unavailable 상태로 노출"
```

### Task 1.3: Desktop startup_error 원인 별도 표시 (검증 보강)

**Files:**
- Verify: `apps/desktop/src/components/settings/DesktopSyncSection.tsx:111-115` — 이미 `startupError` 표시 존재
- Verify: `apps/desktop/src/features/sync/use-desktop-sync-status.ts`

**Step 1: 동작 확인**

Desktop을 실행(`bun run desktop:tauri:dev`)해 Settings에서 ① "실행 중" 배지 ② startup_error 발생 시 오류 배너가 보이는지 확인한다. 이미 구현되어 있으므로 회귀가 없는지 확인만 한다. 포트를 점유한 채 실행해(`lsof -i :34129`로 점유 프로세스 확인 후 의도적 충돌) 오류 배너가 뜨는지 본다.

**Step 2: 문제가 있으면 수정, 없으면 통과 기록**

Expected: "확인 필요" 배지 + 배너 표시. 없으면 `use-desktop-sync-status.ts` 폴링 경로 수정.

### Task 1.4: 시뮬레이터 E2E 수동 게이트 (완료 기준)

**Files:**
- Create: `docs/desktop-mobile-sync.md`에 검증 절차 섹션 추가 (아래 Step 3)

**Step 1: Desktop 광고 확인**

```bash
bun run desktop:tauri:dev &
sleep 8
dns-sd -B _glimpse-sync._tcp local.
```
Expected: `_glimpse-sync._tcp` 서비스 1개 이상 (Desktop 이름). `startup_error` 없음.

**Step 2: 시뮬레이터 루프 검증**

```bash
cd apps/mobile && bun run ios
```
시뮬레이터에서: Settings > Desktop 동기화 > "같은 네트워크에서 찾기" → Desktop 목록 표시 → Desktop의 6자리 코드 입력 → "페어링하고 동기화" → 성공 토스트/상태 확인. 이후 앱을 60초 이상 켜두고 ④ 자동 동기화 동작(마지막 동기화 시각 갱신), 앱 백그라운드→포그라운드 시 ⑤ resume 동기화 확인.

macOS 방화벽이 Node/Tauri 수신을 차단하면 시스템 프롬프트 수락 또는 시스템 설정 > 네트워크 > 방화벽에서 허용.

**Step 3: 검증 절차를 문서화**

`docs/desktop-mobile-sync.md`의 "Connection flow" 아래에 "Manual verification (simulator)" 절차를 위 내용대로 추가.

**Step 4: 커밋**

```bash
git add docs/desktop-mobile-sync.md
git commit -m "docs(sync): 시뮬레이터 수동 검증 절차 문서화"
```

---

## Goal 2 — rustra 0.4.0 업그레이드

### Task 2.1: 의존성 lockstep 갱신

**Files:**
- Modify: `packages/bridge-rust/Cargo.toml:18` (`rustra = "=0.1.3"` → `"=0.4.0"`)
- Modify: `apps/desktop/package.json:12-13` (`@rustra/tauri`, `@rustra/types` → `0.4.0`)
- Modify: `apps/mobile/package.json:50-51` (`@rustra/react-native`, `@rustra/types` → `0.4.0`)
- Modify: `package.json` root `overrides."@rustra/types": "0.1.3"` → `0.4.0`

**Step 1: 갱신 및 설치**

```bash
# Cargo.toml에서 rustra = "=0.1.3" → "=0.4.0"
cargo update -p rustra --manifest-path Cargo.toml
bun install
cargo check -p glimpse-bridge -p glimpse-core
```
Expected: 컴파일 통과. 브레이킹 컴파일 에러는 0.4.0의 API 변경(예: `PackageBuilder` 시그니처)을 반영해 수정.

**Step 2: 커밋**

```bash
git add Cargo.toml Cargo.lock package.json apps/desktop/package.json apps/mobile/package.json packages/bridge-rust/Cargo.toml bun.lock
git commit -m "chore(deps): rustra 0.1.3 → 0.4.0 lockstep 갱신"
```

### Task 2.2: JSI C++을 0.4.0 FFI 계약으로 정렬

**Files:**
- Modify: `apps/mobile/modules/rustra-jsi/ios/RustraJSIBridge.cpp:200-250`
- Modify: `apps/mobile/modules/rustra-jsi/android/src/main/cpp/` (동일 정렬)

**Step 1: 심볼 확인**

```bash
nm -gU target/universal/debug/libglimpse_bridge.a 2>/dev/null | grep rustra_ffi | head -30
# 또는 cargo 빌드 후 staticlib 확인
```
0.4.0에서 `rustra_ffi_invoke_rkyv_v2[_into][_async]`(caller-buffer)가 코어 심볼이다. 기존 `rustra_ffi_invoke`, `rustra_ffi_invoke_json`, `rustra_ffi_invoke_postcard`가 유지되는지 확인하고, `rustra_ffi_invoke_json_into` 프로브→라이트 2단계 프로토콜로 fast path를 전환한다.

**Step 2: 구현**

`makeInvoke`에서 JSON 경로를 `_into` caller-buffer 방식으로 전환: (1) 크기 프로브 호출 (2) JSI 버퍼 할당 (3) write 호출. 실패 시 기존 allocate-return 경로 폴백. `getContractHash`(`rustra_ffi_contract_hash`) 노출은 이미 있음(`RustraJSIBridge.cpp:245`) — 0.4.0 심볼명 변화만 확인·수정.

**Step 3: 빌드 게이트**

```bash
cd apps/mobile && bun run ios  # 시뮬레이터 실행까지
```
Expected: 시뮬레이터에서 앱 부팅, 도메인 커맨드 1건 실행(예: 지식 아이템 저장)으로 브릿지 정상 동작 확인.

**Step 4: 커밋**

```bash
git add apps/mobile/modules/rustra-jsi/
git commit -m "refactor(mobile): JSI 브릿지를 rustra 0.4.0 FFI 계약으로 정렬"
```

### Task 2.3: codegen 재생성 + 이벤트 계약 채택

**Files:**
- Modify: `packages/bridge-rust/src/lib.rs` — `PackageBuilder::event::<E>("...")` 등록 (llm 토큰/다운로드 진행 이벤트)
- Regenerate: `packages/bridge-rust/generated/` (`bun run bridge:generate`)
- Modify: `apps/mobile/src/features/ai/stream-events.ts` → JSI `onEvent` 구독으로 전환
- Modify: 데스크톱 이벤트 소비처 → `@rustra/tauri` `subscribeEvent`/`rustraEventChannel` 전환

**Step 1: Rust에 이벤트 등록 추가**

`src/events.rs`의 4개 이벤트(`emit_llm_token`, `emit_llm_done`, `emit_model_download_progress`, `emit_model_download_done`)를 `PackageBuilder::event::<E>()`로 선언해 schema `events` 섹션을 생성한다. 이벤트 payload 타입은 기존 JSON 페이로드와 동일하게 유지해 소비처 변경을 최소화한다.

**Step 2: codegen**

```bash
bun run bridge:generate
```
Expected: `generated/events.ts` 생성, `commands.ts`에 `commandId` 추가, schema에 이벤트 섹션. TS 컴파일 에러 시 generated 소비처 수정.

**Step 3: 모바일 이벤트 구독 전환**

`stream-events.ts`의 로컬 허브 인터페이스(채널명·페이로드)는 유지하고 내부 구현만 JSI `onEvent`(generated `onRustraEvent`)로 교체한다. 기존 테스트(`stream-events.test.ts`, `llama-service.test.ts`)가 통과하는지 확인하고, 필요하면 테스트만 허브 목업으로 조정.

**Step 4: 데스크톱 구독 전환**

기존 `rustra://` 채널 리스너를 `subscribeEvent`/`rustraEventChannel`로 교체. LLM 스트리밍 UI(토큰 스트림)와 모델 다운로드 진행바가 동작하는지 `bun run desktop:tauri:dev:llm`에서 확인.

**Step 5: 게이트 + 커밋**

```bash
cargo test -p glimpse-bridge -p glimpse-core
bun test
bun run lint && bun run desktop:typecheck && bun run desktop:rust:check
bun run bridge:generate && git diff --exit-code packages/bridge-rust/generated  # codegen 최신성 게이트
```
Expected: 전부 통과.

```bash
git add packages/bridge-rust apps/mobile/src/features/ai apps/desktop/src
git commit -m "feat(bridge): rustra 0.4.0 이벤트 계약 채택 (codegen 재생성, JSI 구독 전환)"
```

### Task 2.4: 계약 게이트·시뮬레이터 재검증

**Step 1:** `expectContractCurrent` 게이트를 CI/스크립트에 추가한다(`bridge:generate` 후 diff check를 이미 Step 5에서 했다면 CI yml에 반영).
**Step 2:** Goal 1 Task 1.4의 시뮬레이터 E2E를 다시 통과한다(0.4.0 위에서 회귀 없음 확인).
**Step 3:** 커밋: `git commit -m "test(ci): rustra 계약 최신성 게이트 추가"`.

---

## Goal 3 — 동기화 로직 공유 Rust 통합

### Task 3.1: bridge-rust에 discovery 트레잇 + desktop 백엔드

**Files:**
- Create: `packages/bridge-rust/src/sync.rs`
- Modify: `packages/bridge-rust/src/lib.rs` — 도메인 등록
- Test: `packages/bridge-rust/src/sync.rs` 내 `#[cfg(test)]`

**Step 1: 실패하는 테스트 작성**

```rust
// packages/bridge-rust/src/sync.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_discovered_service_properties() {
        let txt = [
            ("protocol".to_string(), "1".to_string()),
            ("deviceId".to_string(), "abc123".to_string()),
            ("path".to_string(), "/v1".to_string()),
        ];
        let parsed = parse_txt_records(&txt);
        assert_eq!(parsed.device_id.as_deref(), Some("abc123"));
        assert_eq!(parsed.protocol_version, 1);
    }

    #[test]
    fn filters_wrong_protocol_version() {
        let txt = vec![("protocol".to_string(), "99".to_string())];
        let parsed = parse_txt_records(&txt);
        assert!(parsed.is_none() || parsed.protocol_version != 1);
    }
}
```

**Step 2: 테스트 실패 확인**

Run: `cargo test -p glimpse-bridge sync`
Expected: FAIL (parse_txt_records 미정의)

**Step 3: 최소 구현**

`DiscoveryBackend` 트레잇 + 데스크톱 `mdns-sd` 백엔드 + `sync_discover` 커맨드:

```rust
pub trait DiscoveryBackend {
    fn browse(&self, timeout_ms: u64) -> Result<Vec<DiscoveredDesktop>, String>;
}

pub struct DiscoveredDesktop {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub device_id: Option<String>,
    pub protocol_version: u32,
}

pub fn parse_txt_records(txt: &[(String, String)]) -> Option<ParsedTxt> { /* ... */ }

#[cfg(desktop)]
pub struct MdnsBackend;

#[command]
pub fn sync_discover(timeout_ms: u64, state: ...) -> Result<Vec<DiscoveredDesktop>, String> {
    // 플랫폼 백엔드 선택: desktop=mdns-sd, ios=dnssd, android=JNI
}
```

데스크톱 백엔드는 `mdns_sd::ServiceDaemon::browse`로 기존 데스크톱 `advertise_mdns`와 동일한 `SERVICE_TYPE`을 찾는다.

**Step 4: 테스트 통과 + 커맨드 등록 확인**

Run: `cargo test -p glimpse-bridge sync && bun run bridge:generate && cargo check -p glimpse-bridge`
Expected: PASS + generated에 `syncDiscover` 추가.

**Step 5: 커밋**

```bash
git add packages/bridge-rust packages/bridge-rust/generated
git commit -m "feat(bridge): sync_discover 커맨드와 desktop mdns 백엔드 추가"
```

### Task 3.2: iOS dnssd 백엔드 (Rust C API)

**Files:**
- Modify: `packages/bridge-rust/src/sync.rs` — `#[cfg(target_os = "ios")]` DnsSdBackend
- Create: `packages/bridge-rust/src/sync/dnssd.rs` (또는 동일 파일 내 모듈)

**Step 1: 구현**

`dnssd` C API(`DNSServiceBrowse`/`DNSServiceResolve`/`DNSServiceGetAddrInfo`)를 `dnssd-sys` 크레이트 또는 직접 `extern "C"` 바인딩으로 호출. iOS에서는 multicast entitlement 없이 dnssd가 Bonjour에 허용된다. `.podspec`/staticlib 링크에 `-ldnssd`는 iOS 시스템 라이브러리라 별도 링크 플래그 불필요(liba-resolve 포함 확인). 비동기 콜백은 `std::sync::mpsc`로 폴맬 변환해 timeout 내 결과 수집.

주의: iOS staticlib 빌드 스크립트(`scripts/build-bridge-rust-ios.sh`)에 `bindgen`이 필요 없도록 수동 `extern "C"` 선언을 쓴다.

**Step 2: 컴파일 게이트**

Run: `cd apps/mobile && bun run build:bridge:ios && bun run ios`
Expected: iOS staticlib 빌드 + 시뮬레이터 앱 부팅. 시뮬레이터에서 discovery가 이 백엔드로 동작하면 기존 Swift 모듈과 동일한 결과.

**Step 3: 데스크톱 회귀 확인 + 커밋**

```bash
cargo test -p glimpse-bridge
git add packages/bridge-rust
git commit -m "feat(bridge): iOS dnssd discovery 백엔드 추가"
```

### Task 3.3: Android JNI NsdManager 백엔드

**Files:**
- Create: `apps/mobile/modules/rustra-jsi/android/src/main/java/so/glimpse/mobile/SyncDiscoveryJni.kt` — JNI 브리지(JavaVM 캐시, NsdManager 호출)
- Modify: `packages/bridge-rust/src/sync/android.rs` — JNI extern 함수 호출

**Step 1: 설계 메모**

- Rust에서 JNI 호출은 `jni` 크레이트. staticlib 빌드 스크립트(`build-bridge-rust-android.sh`) 타깃에 `jni` feature 추가.
- Kotlin 측 `SyncDiscoveryJni.init(vm)`을 Application 시작 시 1회 호출해 JavaVM 포인터를 Rust에 전달(`extern "C" fn rustra_sync_set_jvm`).
- `sync_discover`의 Android 경로는 JNI로 `NsdManager.discoverServices`를 실행하고 resolve 결과를 Rust struct로 수집.
- Android 실기기 검증은 불가하므로 **컴파일 게이트만**: `bun run build:bridge:android` 통과.

**Step 2: 컴파일 게이트**

```bash
cd apps/mobile && bun run build:bridge:android
```
Expected: Android staticlib 빌드 성공 (arm64-v8a 등).

**Step 3: 커밋**

```bash
git add apps/mobile/modules/rustra-jsi packages/bridge-rust
git commit -m "feat(bridge): Android JNI NsdManager discovery 백엔드 추가 (컴파일 게이트)"
```

### Task 3.4: sync_plan 커맨드 — 판단 로직 Rust 이동

**Files:**
- Modify: `packages/bridge-rust/src/sync.rs` — `sync_plan` 커맨드
- Test: `packages/bridge-rust/src/sync.rs` `#[cfg(test)]`
- Modify: `apps/mobile/src/features/sync/sync-url.ts` + `sync-client.ts` — 얇은 어댑터로 축소
- Test: `apps/mobile/src/features/sync/sync-url.test.ts` 수정

**Step 1: 실패하는 테스트 작성 (Rust)**

```rust
#[test]
fn prefers_tailscale_over_lan() {
    let plan = plan_endpoints(PlanInput {
        tailscale_url: Some("https://x.ts.net".into()),
        lan_url: Some("http://192.168.0.2:34129".into()),
        outbound_watermark: None,
        last_synced_at: None,
        now_ms: 0,
        full_sync_every_ms: 600_000,
    });
    assert_eq!(plan.endpoints, vec!["https://x.ts.net".to_string(), "http://192.168.0.2:34129".to_string()]);
    assert!(plan.use_watermark == false);
}

#[test]
fn watermark_window_decides_delta_path() {
    let plan = plan_endpoints(PlanInput {
        tailscale_url: None,
        lan_url: Some("http://192.168.0.2:34129".into()),
        outbound_watermark: Some(42),
        last_synced_at: Some(5 * 60_000),
        now_ms: 10 * 60_000, // 5분 경과 < 10분 → delta
        full_sync_every_ms: 600_000,
    });
    assert_eq!(plan.use_watermark, true);
    assert_eq!(plan.watermark, Some(42));
}
```

**Step 2: 실패 확인** — `cargo test -p glimpse-bridge sync_plan` → FAIL

**Step 3: 구현**

`plan_endpoints` 순수 함수 + `#[command] sync_plan`. 로직은 `sync-url.ts`의 `endpointCandidates` + `sync-client.ts`의 워터마크 판단(FULL_SYNC_EVERY_MS)을 이식. `discoveryBaseUrl`/`normalizeBaseUrl`도 파싱 헬퍼로 함께 이동 가능하되, URL 문자열 생성은 TS에 유지해도 무방(순수 로직만 이동).

**Step 4: TS 어댑터 축소**

`sync-client.ts`의 워터마크/후보 판단을 `mobileCoreClient.syncPlan(...)` 결과로 교체. `endpointCandidates`는 `sync_plan`이 실패할 때의 폴백으로 유지. `sync-url.test.ts`에 폴백 경로 테스트 유지.

**Step 5: 전체 게이트 + 커밋**

```bash
cargo test -p glimpse-bridge && bun run bridge:generate && bun test && bun run lint && bun run desktop:typecheck
```
Expected: 전부 통과.

```bash
git add packages/bridge-rust apps/mobile/src/features/sync
git commit -m "feat(bridge): sync_plan으로 엔드포인트·워터마크 판단 로직 공유 Rust 이동"
```

### Task 3.5: TS discovery 어댑터 전환 + 회귀 게이트

**Files:**
- Modify: `apps/mobile/src/features/sync/sync-client.ts` — `discoverSyncDesktops` → `mobileCoreClient.syncDiscover`
- Modify: `apps/mobile/src/hooks/useDesktopSyncSettings.ts` — 폴백 유지
- Modify: `apps/desktop/src-tauri/src/sync/mod.rs` — desktop browse가 bridge 커맨드를 쓰도록 정렬(선택: 데스크톱은 이미 Rust라 서버 직접 유지 가능)

**Step 1: 모바일 전환**

`sync-client.ts`의 `discoverDesktops`가 우선 `mobileCoreClient.syncDiscover(timeout)`을 호출하고, 실패 시 기존 네이티브 모듈(`discoverSyncDesktops`)로 폴백한다. 폴백이 터치되면 Task 1.2의 `unavailable` 상태가 여전히 동작해야 한다.

**Step 2: 시뮬레이터 E2E 재검증**

Task 1.4 절차 재수행 — 발견→페어링→수동→60초 자동→resume 동기화 전부 통과.

**Step 3: 전체 게이트**

```bash
cargo test --workspace && bun test && bun run lint && bun run desktop:typecheck && bun run desktop:rust:check
```
Expected: 전부 통과.

**Step 4: 커밋**

```bash
git add -A
git commit -m "feat(mobile): discovery를 공유 bridge 커맨드로 전환 (네이티브 폴백 유지)"
```

---

## 잔여 과제 (이 플랜 범위 외)

1. OS 백그라운드 태스크(BGTaskScheduler) 실기기 검증 — 시뮬레이터 불가.
2. Android 실기기에서 JNI NsdManager 백엔드 검증 — 테스트 환경 점유 중.
3. Tailscale 원격 동기화는 기존 동작 유지(범위 밖).
