# 사후 push 다음 라운드 — 잔여 과제 9종 구현 계획

## 개요

SPEC(`thoughts/shared/specs/2026-08-27_post-push-next-round.md`)의 9종 과제를 단계별 순차(소규모 정리 → 인프라 안전망 → 대형 공사)로 실행한다. 리서치 병렬 조사 4종으로 SPEC 기술 중 2건을 정정했고, 설계 변수를 모두 확정했다.

**리서치로 정정된 SPEC 전제:**
1. `graphQueued` 하드코딩은 현재 코드에 없음(server.rs에 문자열 0건, 라우트도 health/pair/sync 3개뿐). 그래프 실패 백오프도 고정 15분+연속 3회 차단이 이미 있음(`useKnowledgeGraphAutomation.ts:51-65`). 실제 남은 갭: ① 지수 백오프 아님(고정값), ② 이벤트 listen 등록 실패가 `.catch(() => undefined)`(30행)로 소실, ③ 훅 유닛 테스트 전무, ④ digest 계산이 인라인이라 검증 불가.
2. 온디바이스 임베딩의 경로: bridge-rust에는 llama.cpp가 전혀 없다. 반면 **llama.rn이 이미 `pooling_type`, `context.embedding`, JSI 네이티브를 보유**하므로 llama.rn 직접 사용이 정답(SPEC의 "LoadModelOptions.embedding 추가"와 일치).

**확정된 설계 변수:**

| 변수 | 결정 | 근거 |
|---|---|---|
| 압축 알고리즘 | zstd 대신 **gzip(tower-http CompressionLayer/DecompressionLayer + pako)** | flate2가 이미 의존성 트리에 있고, HTTP 계층만 건드려 bridge regen/staticlib 재빌드 불필요. 감쇠 효과 동일(~10배). SPEC의 "zstd"는 수단이 아니라 목표(페이로드 감소)의 예시였음 |
| 더티 플래그 위치 | `DesktopSyncStateInner`(config.rs:74-85) | sync 서버 핸들러가 `State(state.sync)`로 직접 받음 |
| 자기 해시 skip | 원격 스냅샷 해시를 먼저 비교하고, skip이면 마지막 계산값(cached fingerprint)을 응답에 사용 | `SyncResponse.fingerprint`가 항상 필요하기 때문 |
| 워터마크 저장소 | 데스크톱 `PairedClient` 필드(sync-config.json), 모바일 `SyncConfig` 필드(MMKV) | DB 마이그레이션 불필요, peer map 이미 존재 |
| 프로토콜 버전 | 1 유지 + additive optional 필드만 | assertProtocol이 strict equality라 bump 시 양쪽 동시 배포 필요. 구 서버가 unknown field 무시하는 것(`deny_unknown_fields` 없음) 확인됨 |
| migration 0004 | updated_at 인덱스 4개만(knowledge_items/messages/recommendations/feedback_events) | 워터마크 테이블은 저장소를 파일/MMKV로 정결정했으므로 불필요 |
| 임베딩 컨텍스트 | 채팅용과 별도의 소형 임베딩 전용 컨텍스트(n_ctx 작게) 로드 | "Context is busy"(RNLlamaJSI.cpp:177-192) 재진입 throw를 원천 회피 |
| useForegroundLabeling 중복 | 수렴하지 않음(의도적 분기 문서화만) | 실행기 자체가 다름(desktop=규칙 라벨러, mobile=AI 타겟). 골격 통합은 YAGNI |
| rustra-core-client 중복 | 공통 팩토리로 수렴(initialize 주입형) | diff가 initialize 1곳뿐 |

## 목표 상태

전 게이트(bun test, cargo test ×2, lint) green + 각 Phase의 자동 검증 통과. 수동 GUI 검증·배포는 제외(SPEC 범위 제한).

---

# Phase 1 — 소규모 정리

## Task 1-1: 그래프 자동화 내구성 강화

### 개요
훅에서 digest 계산을 순수 함수로 추출해 유닛 테스트 가능하게 만들고, listen 등록 실패 소실을 막으며, 고정 백오프를 지수 백오프로 교체한다.

### 필요한 변경사항

#### 1. digest 계산 추출 + 백오프 지수화
**파일**: `apps/desktop/src/hooks/useKnowledgeGraphAutomation.ts`
**변경사항**:
- digest 계산부(41-47행)를 `computeGraphSourceDigest(items: KnowledgeItem[]): string` 순수 함수로 추출 (같은 디렉터리 또는 `src/features/graph/`로). 입력 윈도우 선택(24개 slice)도 함께 추출: `selectGraphSourceWindow(items)`.
- `FAILURE_BACKOFF_MS` 상수 제거 → `apps/mobile/src/features/sync/backoff.ts`의 패턴을 desktop 쪽 소폭 변형으로 이식(60s 시작, 2^n, 상한 30분). packages에 공용 유틸 신설(`packages/shared/src/backoff.ts`)하여 양 플랫폼이 소비(mobile 쪽은 이 유틸 재-export로 점진 수렴 — sync-client 즉시 교체는 범위 외).
- localStorage 3키 구조 유지(consecutive failures 카운트 그대로).

#### 2. listen 등록 실패 처리
**파일**: `apps/desktop/src/hooks/useKnowledgeGraphAutomation.ts:30`
**변경사항**:
```ts
listen('glimpse://sync-complete', scheduleGraphRun)
  .catch((error) => {
    // Listener registration failure means graph refresh never fires on sync.
    console.error('[graph] failed to subscribe sync-complete', error);
    setState(f => ({ ...f, listenerError: true }));
  });
```
listenerError면 수동 실행 버튼 경유 경로가 남으므로 기능 정지 아님 — 최소 요건은 소실 금지.

#### 3. 테스트 신설
**파일**: `apps/desktop/src/features/graph/use-knowledge-graph-automation.test.ts` (digest/window/backoff 부분)
- `computeGraphSourceDigest`: 항목 순서 무관 동일 digest, updatedAt 변경 시 digest 변경, 24개 경계(25번째 항목은 무시).
- `packages/shared/src/backoff.test.ts`: backoffDurationMs 수열·상한 clamping.

### 성공 기준
#### 자동 검증:
- [ ] `bun test apps/desktop/src/features/graph packages/shared` 통과
- [ ] `bun run lint` 통과
- [ ] 기존 `generate-knowledge-graph.test.ts` 회귀 없음

---

## Task 1-2: 동기화 값싼 최적화 3종

### 개요
idle 폴링 시 자기 전체 export+SHA256을 제거(원격 해시 선비교 + cached fingerprint), merge 발생 시 더티 플래그 세팅, gzip 페이로드 압축을 HTTP 계층에 도입한다.

### 필요한 변경사항

#### 1. 자기 해시 순서 변경 + cached fingerprint
**파일**: `apps/desktop/src-tauri/src/sync/server.rs:261-313`, `apps/desktop/src-tauri/src/sync/config.rs`
**변경사항**:
- spawn_blocking 블록 재구성:
```rust
// compute remote fingerprint FIRST (no DB read involved),
let remote_fingerprint =
    glimpse_core::SqliteStorage::fingerprint_of_snapshot(&remote_snapshot);
let cached = state.sync.cached_fingerprint();      // Arc<Mutex<Option<String>>>
let skip = remote_fingerprint.is_ok_and(|rf|
    cached.as_deref() == Some(rf.as_str()));
let (merged, own_fingerprint_used) = if skip {
    (None, false)
} else {
    let merged = core.merge_data(&remote_snapshot)?;
    let fresh = core.snapshot_fingerprint()?;
    *cached_slot = Some(fresh.clone());
    (Some(merged), true /* respond with fresh */)
};
```
- 응답: skip 시엔 캐시된 fingerprint(첫 요청엔 캐시가 없으므로 이때만 self export해서 계산+캐시 — 최초 1회 후 idle 무료). `DesktopSyncStateInner`에 `cached_fingerprint: Mutex<Option<String>>` 추가.
- fail-open 유지: fingerprint 계산 불가 시 종전처럼 무조건 merge(주석 명시).

#### 2. 더티 플래그 → 향후 export 생략 준비
**파일**: `server.rs`(merge 성공점), `config.rs`
- merge 성공(snapshot.is_some()) 시 `state.sync.mark_data_dirty()` — 3단계 워터마크의 증분 export와 결합될 신호. 본 태스크에서는 플래그+접근자와 로그까지만(실제 소비처는 3단계 A안). 사유: "성능은 아니고 상태 노출"이라 최소화.

#### 3. gzip 페이로드 압축
**파일**:
- `apps/desktop/src-tauri/Cargo.toml` — `tower-http = { version, features = ["compression-gzip", "decompression-gzip"] }` (flate2가 이미 트리에 존재해 순증가분 작음)
- `apps/desktop/src-tauri/src/sync/server.rs`(Router 빌더) — `DecompressionLayer::new()` + `CompressionLayer::new().gzip(true)` 적용. axum 바디 리밋(64MB)은 압축 후 크기 기준으로 여유 커짐 → 주석 업데이트.
- `apps/mobile/package.json` — `pako` 의존성 추가(+ `@types/pako` dev).
- `apps/mobile/src/features/sync/sync-client.ts:149-175` — 요청: 64KB 초과 snapshot에 한해 pako.gzip → `Content-Encoding: gzip` 헤더와 함께 raw body 전송(작으면 JSON 그대로 — 소형 오버헤드 회피). 응답: fetch는 RN에서透 明압축해제 미보장 → 응답이 gzip인 경우(`content-encoding` 헤더 검사) pako.ungzip 후 JSON.parse, 아니면 기존 경로.
- 서버는 tower-http DecompressionLayer가 요청 gzip을 자동 해제; CompressionLayer가 `Accept-Encoding: gzip`인 응답을 자동 압축 — 모바일은 요청에 해당 헤더를 명시적으로 설정.

#### 4. 테스트
- server.rs 테스트 확장: `run_server_flow`에 gzip 바디 케이스 추가(압축 요청이 정상 머지되는지).
- sync-client 관련 기존 테스트(`apps/mobile/src/features/sync/*.test.ts`)에 gzip 분기 유닛 테스트 추가(64KB 경계, ungzip 파싱).

### 성공 기준
#### 자동 검증:
- [ ] `cargo test -p glimpse-desktop` (src-tauri) 통과
- [ ] `bun test apps/mobile/src/features/sync` 통과
- [ ] 대형 픽스처(~10k 레코드급 fixture는 없으므로 반복 생성)에서 gzip payload 크기 축소율 로그로 기록 — 페이로드 감소율 ≥ 70% 확인을 테스트 assertion으로
- [ ] `cargo clippy -D warnings`, `bun run lint` 통과

---

## Task 1-3: 거절 페널티 시간 창

### 개요
30일(window 상수) 이전 거절 verdict가 rejectedPairs/tagVerdicts 집계에서 만료되게 한다.

### 필요한 변경사항

**파일**: `packages/features/src/recommendation/index.ts`
**변경사항**:
```ts
const VERDICT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const DEFAULT_NOW = () => Date.now();      // 주입식 now 테스트용
function isVerdictExpired(at: number, now: number): boolean {
  return now - at > VERDICT_WINDOW_MS;
}
```
- edge-based verdict(83-89행): `responded_at ?? created_at` 기준으로 만료 거절은 rejectedPairs/tagVerdicts에서 제외. 기존 accepted는 영향 없음(수락은 감쇠 대상 아님 — **제품 방향 확정**: 거절만 만료).
- feedback-based verdict(77-89행): `createdAt` 기준 동일 필터.
- 만료된 레코드는 완전히 무시(accepted도 시간창 밖이면 tagVerdicts 미집계 — 양쪽 일관).

**파일**: `packages/features/src/recommendation/index.test.ts`
- 31일 전 거절 → 동일 쌍 재추천됨 / 29일 전 거절 → 차단 유지 / 만료 accepted는 태그 집계에서 제외 등 4~5케이스(mock coreClient 스타일 유지, now 주입).

### 성공 기준
#### 자동 검증:
- [ ] `bun test packages/features/src/recommendation` 통과
- [ ] lint 통과

---

## Task 1-4: rustra-core-client 중복 수렴

### 개요
데스크톱/모바일의 `rustra-core-client.ts`(~150행씩, diff=initialize 1곳)를 공통 팩토리로 수렴한다. useForegroundLabeling은 실행기 자체가 달라 수렴 대상에서 제외(헤더 주석에 의도적 분기 명시 — 결정 기록).

### 필요한 변경사항

**파일**: `packages/shared/src/core-client/create-rustra-core-client.ts` (신설)
**변경사항**:
- 생성된 `@glimpse/bridge-generated` 어댑터 전체를 팩토리 함수로: `createRustraCoreClient(deps: { initialize(dbPath?: string): Promise<void> })`.
- 데스크톱(`apps/desktop/src/features/core/rustra-core-client.ts`)·모바일(`apps/mobile/src/features/core/rustra-core-client.ts`)은 각각 initialize 바인딩만 남긴 얇은 래퍼로 교체. 외부 API 시그니처 불변(회귀 게이트: 기존 테스트 전량).
- mobile 회귀 게이트: `initialize-core-client.retry.test.ts` 포함 전체 bun test.

### 성공 기준
#### 자동 검증:
- [ ] `bun test` 전체 통과 (양쪽 앱의 core-client 소비 테스트 포함)
- [ ] 중복 제거 확인: 두 앱 클라이언트 파일이 각각 ≤20행
- [ ] lint 통과

---

# Phase 2 — 인프라 안전망

## Task 2-1: Playwright 스모크 CI 게이트

### 개요
브라우저(Chromium)에서 데스크톱 웹 번들이 앱 셸을 렌더링하는지 PR마다 검증한다(목표 ≤3분). Tauri invoke는 init script로 스텁한다.

### 필요한 변경사항

#### 1. invoke 스텁 + playwright 설정
**파일**: `apps/desktop/e2e/smoke.spec.ts`, `apps/desktop/playwright.config.ts`, `apps/desktop/package.json` (devDeps: `@playwright/test`)
**변경사항**:
- `page.addInitScript`로 `__TAURI_INTERNALS__` 모킹 — `invoke(cmd)`가 sync-related/labeling/list류 명령은 빈 배열/빈 객체를 반환하고 LLM류는 reject. 스텁 테이블은 `smoke-stubs.ts`로 분리.
- assertion: `/library` 리디렉트 후 앱 셸(헤더/네비/빈 상태 copy) 가시 + 치명적 에러 boundary 미발생. 브라우저 console error 수집 후 known-invoke-failure 제외 0건.
- 설정: `vite preview`(빌드 산물, 1420포트, strictPort), webServer 자동 기동, workers=1, retries=0, Chromium 한 브라우저.

#### 2. CI 잡
**파일**: `.github/workflows/ci.yml`
**변경사항**:
- js 잡 뒤 또는 독립 `desktop-smoke` 잡: paths filter(desktop/shared 영역 변화 시)+PR/push 메인 레인. `bunx playwright install --with-deps chromium`, 스모크 실행. 타임아웃 10분 잡 한계.
- 첫 도입이라 실패 허용(`continue-on-error: false` 유지하되 안정화 관찰 후 결정 — 리서치 권고와 동일하게 일단 blocking으로 시도, 2회 연속 인프라성 red 시 relax 검토)

### 성공 기준
#### 자동 검증:
- [ ] 로컬 `bunx playwright test -c apps/desktop` 통과
- [ ] CI desktop-smoke 잡 green (실행 시간 3분 이내 확인을 job summary에 출력)

---

## Task 2-2: expo SDK 55 → 57 업그레이드

### 개요
expo ~55.0.29/RN 0.83.10 → expo 57(RN 0.86.2, React 19.2 유지). expo-modules-core의 Swift 동시성 × Xcode 호환 붕괴를 근본 수리한다.

### 필요한 변경사항

#### 1. 의존성 갱신
**파일**: `apps/mobile/package.json`, root `package.json`(overrides), `bun.lock`
- `npx/bunx expo install expo@^57` 흐름 + `--fix` — bun 환경이라 `bunx expo install --fix` 후 `bun install`.
- `@expo/metro-runtime` override를 55.0.12 → SDK 57 대응 버전.
- `expo-share-extension ^5.0.6`, `expo-share-intent ^6.1.1`의 SDK 57 호환 버전으로 bump(registry 조회 후 호환선).
- RN 0.86으로 llama.rn, react-native-blob-util, vision-camera 등 네이티브 라이브러리 호환선 재확인.

#### 2. 네이티브 재생성
- `ios/` 디렉터리는 커밋된 bare 워크플로우 → pods 재설치 + XcodeGen/prebuild 필요 여부 확인(`expo prebuild` 대신 수동 Podfile 조정이 관례인지 docs 확인).
- `pod install` 후 로컬 `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` 전체 워크스페이스 빌드.
- Android는 gradle 기반으로 `bun run android` 조립 확인(에뮬레이터 부팅까지 아님, assembleRelease 정도).

#### 3. 검증
- 로컬 iPhone 시뮬레이터에서 앱 부팅 및 기본 화면 탐색(수동 항목 — GUI 수동 검증과 별도로 "빌드&부팅"만).
- 실패 시: 원인(패키지/버전/네이티브 충돌)을 `thoughts/shared/research/`에 기록하고 롤백 — SPEC이 허용하는 "명시적 실패 원인 기록" 경로.

### 성공 기준
#### 자동 검증:
- [ ] `bun install` 후 `bun run lint`, `bun test` 통과
- [ ] `cd apps/mobile/ios && xcodebuild -workspace ... build` CODE_SIGNING_ALLOWED=NO 성공
- [ ] `cd apps/mobile/android && ./gradlew assembleRelease` 성공(서명 없이 조립)

#### 수동 검증(부팅 한정):
- [ ] iOS 시뮬레이터 앱 부팅·라이브러리 화면 렌더 확인

---

## Task 2-3: ShareExtension 빌드 수리

### 개요
ShareExtension target이 로컬 xcodebuild에서 깨지는 원인을 재현·수리한다. 유력 원인: `ShareViewController.swift:632-674`의 AVAsset 계열 사용에 `import AVFoundation` 누락.

### 필요한 변경사항

**파일**: `apps/mobile/ios/ShareExtension/ShareViewController.swift`
**변경사항**:
1. `xcodebuild -project glimpse.xcodeproj -target ShareExtension -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO build`로 실제 오류 재현(로그 근거 확보).
2. `import AVFoundation` 추가(AVAsset/AVAssetImageGenerator/CMTimeGetSeconds 사용분).
3. `try!` 2곳(110, 142행) — 공유 텍스트/URL 파싱을 do-catch로 교체(실패 시 조용히 abort가 아니라 alert 경유 사용자 피드백).
4. 전체 워크스페이스 빌드(embed PlugIns에 extension 포함)로 재검증.

### 성공 기준
#### 자동 검증:
- [ ] `-target ShareExtension` 단독 빌드 성공
- [ ] `-scheme glimpse` 전체 빌드 성공(extension 간접 포함)

---

# Phase 3 — 대형 공사

## Task 3-1: 온디바이스 임베딩(llama.rn 경로)

### 개요
BYOK 미설정/ON 시 원격 사용이 우선이되, 오프라인·프라이버시 우선 사용자를 위해 다운로드한 nomic 모델로 온디바이스 임베딩을 제공한다. **채팅 컨텍스트와 별도의 임베딩 전용 컨텍스트**를 로드해 "Context is busy"를 원천 회피한다.

### 필요한 변경사항

#### 1. llama.rn 옵션 확장
**파일**: `apps/mobile/src/features/ai/llama-service.types.ts`, `llama-service.utils.ts`
- `LoadModelOptions`에 `embedding?: boolean`, `poolingType?: 'mean'|'cls'|'last'|'rank'|'none'` 추가.
- `buildLoadOptions`가 `embedding`, `pooling_type` 매핑.

#### 2. 임베딩 전용 컨텍스트 매니저
**파일**: `apps/mobile/src/features/search/on-device-embedder.ts` (신설)
- initLlama(별도 인스턴스, `embedding: true`, `pooling_type: 'mean'`, n_ctx 1024~2048, gpuLayers 작게)로 순차 embed 배치. promise 직렬 큐(내부 mutex)로 동시 호출 차단.
- 앱 생명주기: 백그라운드 진입 시 release, foreground에서 lazy 재초기화.
- dispose/에러 시 null 반환 → 키워드 폴백(useSemanticRerank warn-once 흐름 재사용).

#### 3. 모델 레지스트리
**파일**: `packages/shared/src/local-model-registry.ts:789-800`
- `nomic-embed-text-v1.5-q8_0`에 `mobileProfile` 신설(minRamGb 4, tier 'embedding', recommended flag) — MobileModelProfile 인터페이스(30-49행) 재사용. 모델 매니저(model-downloader/model-download-storage)가 이 프로파일로 다운로드 가능하도록 연결(검색 화면 or 설정에 "임베딩 모델" 다운로드 진입점 — 최소 UI).

#### 4. semantic deps 세 번째 분기
**파일**: `apps/mobile/src/features/search/useMobileSemanticRerank.ts`
- 결정 순서 확정: BYOK 구성+provider가 embedding 지원 → BYOK 사용. 아니면 온디바이스 모델 다운로드+준비 완료 시 온디바이스. 둘 다 아니면 null(키워드만).
- 프라버시 문구(SemanticSearchSection)에 온디바이스 모드는 "기기 내 처리, 외부 전송 없음" 추가.

#### 5. 테스트
- on-device-embedder: 순직렬화(동시 호출이 겹치지 않음), busy 에러 재시도 없이 폴백 반환, dispose 후 호출 시 null.
- useMobileSemanticRerank 분기 테스트(BYOK 우선/on-device 폴백/모두 없음).

### 성공 기준
#### 자동 검증:
- [ ] `bun test apps/mobile/src/features/search` 통과
- [ ] lint 통과

#### 수동(빌드 한정, GUI 상세 검증 제외):
- [ ] iOS에서 nomic v1.5(q8_0, ~312MB) 다운로드 → 검색 재정렬 1회 동작 확인

---

## Task 3-2: 워터마크 델타 동기화(A안)

### 개요
`sinceWatermark` optional 필드로 변경분만 주고받는 증분 경로를 additive하게 추가한다. 프로토콜 버전 1 유지, 구客户端/서버와 상호 호환.

### 필요한 변경사항

#### 1. migration 0004
**파일**: `packages/core-rust/src/storage/migrations/0004_delta_sync_indexes.sql` (신설), `sqlite/mod.rs:23-26,96-107`
```sql
BEGIN IMMEDIATE;
CREATE INDEX IF NOT EXISTS idx_knowledge_items_updated_at ON knowledge_items(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_updated_at ON messages(updated_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_updated_at ON recommendations(updated_at);
CREATE INDEX IF NOT EXISTS idx_feedback_events_updated_at ON feedback_events(updated_at);
PRAGMA user_version = 4;
COMMIT;
```
- `SCHEMA_VERSION = 4` bump, 적용 블록 `if current_version < 4` 추가.

#### 2. 증분 export + row-merge 경로
**파일**: `packages/core-rust/src/storage/sqlite/sync.rs`
- `export_delta(&self, since_clock_ms: i64) -> Result<DataExport>`: 테이블별 clock 식(merge가 쓰는 `message_clock`(:469-474) 등과 동일 논리)으로 `> since_clock_ms` 행 select. guardband는 호출자(서버)가 `since - 24h`로 처리(코어는 단순 select).
- `apply_delta(&self, delta: &DataExport) -> Result<DataExport>`: 기존 `replace_all_data` 우회. 테이블별로 행 단위: 동일 id 존재 시 `prefer_candidate(기존, 신규)` 승자 UPDATE / 없으면 INSERT. tombstone은 기존 apply_tombstones 논리 재사용. 참조 무결성(recommendations→items FK)은 delete가 먼저인 순서 보장.
- **테스트**(순수 fixture 관례 유지): export_delta 커서 정합성(since 이후만), apply_delta upsert(LWW 승자), tombstone이 살아있는 레코드 제거, 방향 무관 수렴(apply_delta(old_new) vs apply_delta(new_old)), FK 순서.

#### 3. 서버(wire)
**파일**: `apps/desktop/src-tauri/src/sync/server.rs`, `mod.rs:12`
```rust
struct SyncRequest {
    device_id: String,
    fingerprint: Option<String>,          // deprecated 유지
    snapshot: Option<glimpse_core::DataExport>,   // full path용(Option으로 완화 — additive)
    since_watermark: Option<i64>,         // 신규
}
struct SyncResponse { ..., delta: Option<glimpse_core::DataExport> }  // 신규, snapshot과 별쇄
```
- 흐름: `since_watermark` 있으면 → 요청 snapshot 생략 허용(None), 서버 `export_delta(watermark - GUARDBAND_24H)`로 `delta` 채움 + merge는 기존 full snapshot일 때만. watermark 없는 요청은 기존 full 경로 그대로(호환).
- 모바일에 delta 있으면 응답 fingerprint는 생략 가능 필드로… 아니, 유지. skip 판정은 기존 fingerprint 경로 유지(delta만 additive).
- dirty 플래그(Task 1-2)를 여기서 소비할 수도 있지만, delta는 watermark 기준이라 무관 — 서버가 매 delta 요청마다 `export_delta`를 실행(인덱스 덕에 저렴).

#### 4. 모바일 클라이언트
**파일**: `apps/mobile/src/features/sync/sync-client.ts`, `types.ts`, `sync-store.ts`
- `SyncConfig`에 `outboundWatermark: i64|null` 필드(MMKV persist, :28-30 경로). export: watermark 있으면 스냅샷 전송 생략하고 `since_watermark`만 전송(업로드 13MB→KB급). 응답: `delta` 있으면 `mergeDelta(JSON.stringify(...))` — bridge에 merge_delta 신설 command 필요 → **bridge-rust에 `#[command] merge_delta(data_json) -> merge 결과 요약` 신설 + `bun run bridge:generate` + staticlib 재빌드(iOS/Android)**.
  - 이번이 유일한 bridge 표면 확장. add-only라 기존 contract hash 변동은 흡수(문서 절차 따름).
  - `assertProtocol` 유지(버전 1 고정).
- 워터마크 진행 조건: mergeDelta 성공 + 응답에 서버시각/최대 clock 정보가 있으면 갱신. 서버가 `new_watermark: Option<i64>` 응답 필드로 최대 clock을 돌려주는 게 낙관 전파 방지상 안전 → 응답에 additive 필드 1개 더.
- fallback: 응답에 `delta` 대신 `snapshot`이 오면(서버가 watermark를 못 씀 — 구 버전/리셋) 기존 mergeData 경로 + watermark 초기화.
- unpair/reset 시 `resetSyncConfig`가 watermark 제거 확인.

#### 5. 테스트
- server.rs: watermark 요청→delta 응답(full snapshot None), watermark 없음→full 경로, guardband 적용 확인.
- mobile sync-client: delta 응답 처리(mergeDelta 호출), snapshot 폴백 시 watermark 초기화, 업로드 생략 분기.
- core-rust 통합: export_delta→apply_delta 라운드트립이 merge_exports와 동일 결과(fuzz-lite 3 케이스).

### 성공 기준
#### 자동 검증:
- [ ] `cargo test -p glimpse-core`(core-rust) 전체 + 신규 델타 테스트 통과
- [ ] `cargo test -p glimpse-desktop`(src-tauri) 통과
- [ ] `bun test apps/mobile/src/features/sync` 통과
- [ ] `bun run bridge:generate` 후 generated/ diff 커밋, iOS/Android staticlib 빌드 성공
- [ ] clippy -D warnings, lint 통과

---

# 실행 순서와 커밋 전략

1. Task 1-1 → 1-2 → 1-3 → 1-4 순차(각각 독립 커밋, 게이트 통과 시점 커밋)
2. Task 2-1(CI) → 2-3(ShareExtension 소규모라 선행 빠름) → 2-2(expo 업그레이드 — 가장 무거운 네이티브 작업, ShareExtension 수리 결과가 재생성 ios/에 흡수되므로 2-3을 먼저)
3. Task 3-1 → 3-2 (3-2의 bridge regen은 3-1과 독립)
4. 최종: 전체 게이트 + 메모리 갱신 + (push는 사용자 확인 후)

## 범위 제한 (SPEC 상속)
- 배포(EAS), GUI 수동 검증 제외
- 워터마크 B안(HLC), wdio E2E, iOS CI pin(로컬 검증 위임), 완전 증분 파이프라인(digest 정합성까지만) 금지

## 참고 자료
- SPEC: `thoughts/shared/specs/2026-08-27_post-push-next-round.md`
- 리서치: `thoughts/shared/research/2026-08-27_13-07-25_large-next-steps.md`(값싼 3종·A안 실측), `thoughts/shared/research/2026-08-26_15-20-14_next-improvement-opportunities.md`(그래프·중복 쌍)
- 핵심 파일: `apps/desktop/src-tauri/src/sync/server.rs`(239-357), `packages/core-rust/src/storage/sqlite/sync.rs`, `apps/mobile/src/features/sync/sync-client.ts`, `packages/hooks/src/search/useSemanticRerank.ts`, `apps/desktop/src/hooks/useKnowledgeGraphAutomation.ts`, `apps/mobile/src/features/search/*`(BYOK semantic), `apps/mobile/modules/llama.rn`pooling(node_modules 참조선)
