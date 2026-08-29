# 양방향 델타 동기화 "즉시 전파" 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 모바일의 로컬 변경(캡처·채팅·복습·피드백)이 델타로 데스크톱에 수 초 내 전파되고, 실패해도 데이터가 유실되지 않는 양방향 증분 동기화를 완성한다.

**Architecture:** 기존 `/v1/sync` 요청에 옵셔널 `upstreamDelta`(모바일이 `export_delta(lastAckedClock)`으로 추출)를 추가한다. 서버는 `apply_delta`로 병합 → 응답에 `upstreamAck`(서버가 병합을 확정한 최대 클록)을 실어 돌려주고, 모바일은 응답을 **받은 뒤에만** `lastAckedClock`을 전진시킨다. 실패 시 커서가 그대로라 변경분은 다음 시도에 재전송된다(멱등 — LWW 병합). 사전 백업·크기 한도 폴백·적응형 폴링으로 4대 안전 제약(무손실·복구·보안·무방해)을 지킨다.

**Tech Stack:** Rust (core-rust `export_delta`/`apply_delta` 재사용, axum server), TypeScript (mobile sync-client, zustand sync-store), bun test + cargo test.

**설계 문서:** `docs/plans/2026-08-29-bidirectional-delta-sync-design.md`

---

## 참고: 확인된 코드 팩트 (계획 작성 시점)

- 모바일·데스크톱 모두 `sync_data_revision` 트리거 DB(`0004_delta_sync.sql`)와 `SqliteStorage::export_delta(since_clock_ms)`(`packages/core-rust/src/storage/sqlite/sync.rs:86`)를 공유한다.
- 워터마크 델타 경로는 이미 존재: 모바일이 `sinceWatermark` 전송 → 서버가 `export_delta`로 하행 델타 응답(`apps/desktop/src-tauri/src/sync/server.rs:296-327`).
- 브릿지 커맨드: `exportData`, `mergeData`, `mergeDelta`만 존재. **`exportDelta`/`syncDataRevision` 브릿지 커맨드는 없다** → 신규 추가 필요 (`packages/bridge-rust/src/data.rs`, 이후 `bun run bridge:generate`).
- 모바일 sync 상태는 `SyncConfig`(`apps/mobile/src/features/sync/sync-store.ts`) — `outboundWatermark`(마지막 전체 화해의 최대 병합 클록), `snapshotFingerprint`, `lastSyncedAt` 보관.
- 모바일이 자기 DB에서 델타를 뽑으려면 클록 커서가 필요하다. **`outboundWatermark`를 상행 커서(`lastAckedClock`)로 재사용한다** — (a) 이미 전체 화해/델타 폴링에서 유지되는 값이고, (b) 클록 기반이라 서버도 같은 성질로 ack를 계산할 수 있고, (c) 워터마크가 없는 신규 페어링 직후에는 전체 스냅샷 경로가 이미 모든 것을 상행시키므로 갭이 없다.
- 데스크톱 DB는 `app_data_dir/glimpse-core.db`(`apps/desktop/src-tauri/src/main.rs:32`) — 백업은 이 파일 + WAL/SHM을 복사한다.
- 서버 전체 경로에 fingerprint 캐시(`cached_fingerprint_for_revision`)가 있다. 상행 델타 병합은 데이터셋을 바꾸므로 캐시 무효화(`take_data_dirty`, `sync-complete` 이벤트)가 필요하다.

---

### Task 1: 브릿지에 `exportDelta` + `syncDataRevision` 커맨드 추가

`exportDelta`는 모바일이 자기 DB에서 상행 델타를 뽑을 때 필요하다. `syncDataRevision`은 진단용이지만 커서 무결성 검증(ack 전 대조)에 함께 노출한다.

**Files:**
- Modify: `packages/bridge-rust/src/data.rs`
- Test: `packages/bridge-rust/tests/` (기존 테스트 파일 참조해 배치)

**Step 1: 기존 merge_delta 테스트 패턴 확인**

Run: `grep -rn "merge_delta" packages/bridge-rust/tests/ | head -5`
Expected: 기존 커맨드 테스트 위치·패턴 확인. 없으면 core-rust 테스트만으로 진행(브릿지 커맨드는 얇은 위임이므로).

**Step 2: data.rs에 커맨드 추가**

`packages/bridge-rust/src/data.rs`의 `merge_delta` 뒤에 추가:

```rust
#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExportDeltaInput {
    pub since_clock_ms: i64,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ExportDeltaOutput {
    pub data_json: String,
}

/// Incremental export for the upstream (client→desktop) delta path: rows
/// whose merge clock is strictly newer than `since_clock_ms`, plus all
/// tombstones. Mirrors `export_data` but bounded by a clock cursor.
#[command]
pub fn export_delta(input: ExportDeltaInput) -> Result<ExportDeltaOutput> {
    let core = crate::state::core_state();
    let data_json = core
        .export_delta_json(input.since_clock_ms)
        .map_err(crate::error::to_rustra_err)?;
    Ok(ExportDeltaOutput { data_json })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SyncDataRevisionInput {}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SyncDataRevisionOutput {
    pub revision: i64,
}

#[command]
pub fn sync_data_revision(_input: SyncDataRevisionInput) -> Result<SyncDataRevisionOutput> {
    let core = crate::state::code_state_placeholder(); // ← 실제로는 state::core_state()
    Ok(SyncDataRevisionOutput {
        revision: core.sync_data_revision().map_err(crate::error::to_rustra_err)?,
    })
}
```

주의: `state.rs`에 `code_state_placeholder`는 없다 — `core_state()`를 사용한다. 위 스니펫은 의사코드이며 실제 구현은 `merge_delta`와 동일한 `crate::state::core_state()` 패턴을 따른다. `export_delta_json`이 core에 없으면 `application/portability.rs`에 `export_data_json` 옆에 추가한다:

```rust
pub fn export_delta_json(&self, since_clock_ms: i64) -> Result<String> {
    let delta = self.client().export_delta(since_clock_ms)?;
    serde_json::to_string(&delta).map_err(|e| anyhow::anyhow!(e))
}
```

(정확한 직렬화 에러 변환은 `export_data_json` 기존 구현을 따른다.)

**Step 3: cargo test 통과**

Run: `cargo test -p glimpse-bridge --lib 2>&1 | tail -5`
Expected: PASS (신규 커맨드가 기존 테스트를 깨지 않음)

**Step 4: TS 클라이언트 재생성**

Run: `bun run bridge:generate`
Expected: `packages/bridge-rust/generated/commands.ts`에 `exportDelta`, `syncDataRevision` 추가 확인 (`grep -c "exportDelta\|syncDataRevision" packages/bridge-rust/generated/commands.ts` → 2 이상)

**Step 5: 계약 게이트**

Run: `bun run bridge:generate && bun test packages/bridge-rust`
Expected: 계약 게이트(`expectContractCurrent`) 통과 — 생성물이 커밋됨.

**Step 6: Commit**

```bash
git add packages/bridge-rust packages/core-rust
git commit -m "feat(bridge): exportDelta·syncDataRevision 커맨드 추가"
```

---

### Task 2: shared CoreClient + mobile CoreClient에 exportDelta 연결

**Files:**
- Modify: `packages/shared/src/core-client/create-rustra-core-client.ts`
- Modify: `apps/mobile/src/features/core/types.ts:74-85`
- Test: `apps/mobile/src/features/core/mobile-core-client.test.ts` (패턴 참조)

**Step 1: shared 클라이언트에 위임 추가**

`create-rustra-core-client.ts`: import에 `exportDelta`, `syncDataRevision` 추가하고, `mergeDelta` 옆에:

```typescript
exportDelta: async (sinceClockMs) => (await exportDelta({ sinceClockMs })).dataJson,
syncDataRevision: async () => (await syncDataRevision({})).revision,
```

**Step 2: mobile CoreClient 타입 확장**

`apps/mobile/src/features/core/types.ts`의 Data portability 섹션:

```typescript
  /**
   * Incremental export bounded by a merge-clock cursor (upstream delta path).
   * Optional: the in-memory fallback client does not implement it, so sync
   * callers degrade to a full snapshot when absent.
   */
  exportDelta?(sinceClockMs: number): Promise<string>;
  syncDataRevision?(): Promise<number>;
```

`native-core-client.native.ts`에도 위임 추가:

```typescript
  exportDelta: (sinceClockMs) =>
    selectDelegate().then((c) => c.exportDelta?.(sinceClockMs) ?? c.exportData()),
  syncDataRevision: () =>
    selectDelegate().then((c) => c.syncDataRevision?.() ?? null),
```

(폴백 클라이언트는 옵셔널로 두고, sync-client는 `exportDelta` 부재 시 기존 전체 스냅샷 경로를 유지한다 — 안전한 하위 호환.)

**Step 3: bun test**

Run: `bun test apps/mobile/src/features/core`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/shared apps/mobile/src/features/core
git commit -m "feat(core-client): exportDelta·syncDataRevision 클라이언트 위임 추가"
```

---

### Task 3: SyncConfig에 `lastAckedUpstreamClock` 추가

**Files:**
- Modify: `apps/mobile/src/features/sync/types.ts` (SyncConfig)
- Modify: `apps/mobile/src/features/sync/sync-store.ts` (DEFAULT_CONFIG)
- Test: `apps/mobile/src/features/sync/sync-store` 관련 기존 테스트 유지

**Step 1: 타입 추가**

`types.ts` SyncConfig에:

```typescript
  /**
   * Highest local merge clock the desktop has confirmed merging from this
   * device (upstream delta ack). Advanced ONLY from a successful server
   * response — never optimistically — so a failed transfer re-sends the
   * same rows next attempt (idempotent under LWW). Null until the first
   * full-snapshot reconciliation establishes a baseline.
   */
  lastAckedUpstreamClock: number | null;
```

`sync-store.ts` DEFAULT_CONFIG에 `lastAckedUpstreamClock: null` 추가. `loadConfig`의 spread 병합(`{ ...DEFAULT_CONFIG, ...parsed }`)이 기존 저장본에 자동으로 null을 채운다.

**Step 2: bun test + lint**

Run: `bun test apps/mobile/src/features/sync && bun run lint`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/mobile/src/features/sync
git commit -m "feat(mobile): sync config에 상행 ack 커서 lastAckedUpstreamClock 추가"
```

---

### Task 4: sync-client 상행 델타 첨부 + ack 처리 (핵심)

**Files:**
- Modify: `apps/mobile/src/features/sync/sync-client.ts:155-293` (runSync)
- Test: Create `apps/mobile/src/features/sync/sync-client.upstream.test.ts`

**Step 1: 실패 테스트 작성**

`sync-client.upstream.test.ts` — 기존 `sync-client.watermark.test.ts`의 mock 패턴(fetch mock + SecureStore mock)을 재사용한다. 케이스:

```typescript
// 1. watermark 경로에서 exportDelta 결과가 요청에 첨부되는가
//    - fetch mock이 body를 검사: upsertedDelta 필드 존재 + sinceClock == lastAckedUpstreamClock
// 2. 응답 upstreamAck가 있으면 lastAckedUpstreamClock 전진
//    - updateSyncConfig 호출 검증
// 3. 응답 실패(throw) 시 lastAckedUpstreamClock 불변
// 4. exportDelta 미지원 폴백(델타 null 첨부) → 기존 동작 유지
// 5. upstreamAck 없는 구버전 서버 응답 → 커서 불변 (워터마크만 갱신)
```

Run: `bun test apps/mobile/src/features/sync/sync-client.upstream.test.ts`
Expected: FAIL (구현 없음)

**Step 2: runSync에 상행 경로 구현**

`sync-client.ts` 변경 요지:

```typescript
// watermark 결정 직후:
const upstreamDeltaPromise =
  watermark != null && mobileCoreClient.exportDelta
    ? mobileCoreClient
        .exportDelta(config.lastAckedUpstreamClock ?? 0)
        .then((json) => JSON.parse(json) as unknown)
        .catch(() => null) // 델타 추출 실패는 치명적이지 않다 — 전체 재전송은 화해가 담당
    : null;

// attempt() 내 requestBody 구성:
if (upstreamDeltaPromise) {
  requestBody.upstreamDelta = await upstreamDeltaPromise;
}
```

응답 처리 — delta 경로와 full 경로 모두에서, 성공 응답에 `upstreamAck`가 있으면:

```typescript
config = updateSyncConfig({
  ...existingUpdates,
  upstreamAck: response.upstreamAck != null
    ? Math.max(response.upstreamAck, config.lastAckedUpstreamClock ?? 0)
    : config.lastAckedUpstreamClock, // 구버전 서버: 커서 불변
});
```

전송 실패 시 `runSync`는 기존대로 throw → `lastAckedUpstreamClock`은 updateSyncConfig가 호출되지 않아 불변. 다음 시도가 같은 변경분을 재전송한다.

`types.ts` SyncResponse에 `upstreamAck: number | null` 추가.

**Step 3: 테스트 통과**

Run: `bun test apps/mobile/src/features/sync/sync-client.upstream.test.ts`
Expected: PASS

**Step 4: 기존 sync 테스트 회귀**

Run: `bun test apps/mobile/src/features/sync`
Expected: 기존 watermark/auth-backoff/discovery 테스트 전부 PASS

**Step 5: Commit**

```bash
git add apps/mobile/src/features/sync
git commit -m "feat(mobile): 동기화 요청에 상행 델타 첨부·ack 기반 커서 전진"
```

---

### Task 5: 서버가 상행 델타 수용 (apply_delta + ack)

**Files:**
- Modify: `apps/desktop/src-tauri/src/sync/server.rs:49-65` (SyncRequest), `:69-88` (SyncResponse), `:269-421` (sync 핸들러)
- Test: `apps/desktop/src-tauri/src/sync/server.rs` tests 모듈 (기존 패턴 재사용)

**Step 1: 실패 테스트 작성 (server.rs tests 모듈)**

기존 테스트(`run_server_flow` 헬퍼, `SqliteStorage` 인메모리 패턴) 재사용. 케이스:

```rust
// 1. upstream_delta 포함 요청 → apply_delta 병합됨(행 수 검증) + 응답 upstream_ack >= 델타 내 최대 클록
// 2. upstream_delta + since_watermark 동시 → 양쪽 모두 처리(하행 델타 + 상행 병합)
// 3. upstream_delta 단독(하행 요청 필드 없음) → 병합만 하고 delta 응답은 None
// 4. 중복 재전송(같은 델타 2회) → 두 번째도 성공, 행 수 0(멱등)
// 5. upstream_delta 없는 기존 요청 → 기존 동작 그대로(하위 호환)
```

Run: `cargo test -p glimpse-desktop 2>&1 | tail -5` (정확한 패키지명은 src-tauri Cargo.toml 확인)
Expected: FAIL

**Step 2: SyncRequest/SyncResponse 필드 추가**

```rust
struct SyncRequest {
    // ... 기존 필드
    /// Upstream (client→desktop) incremental payload. Additive, protocol v1:
    /// absent on legacy clients. Merged BEFORE the downstream response is
    /// computed so the response reflects post-merge state.
    upstream_delta: Option<glimpse_core::DataExport>,
}

struct SyncResponse {
    // ... 기존 필드
    /// Highest merge clock the server confirmed merging from the request's
    /// upstream delta. The client advances `lastAckedUpstreamClock` only
    /// from this — null (legacy semantics) keeps the client cursor frozen.
    upstream_ack: Option<i64>,
}
```

**Step 3: sync 핸들러에 병합 로직 추가**

`spawn_blocking` 블록 **시작 부분**(하행 처리 이전)에:

```rust
// --- Upstream first: merge the client's delta before computing the
// downstream response, so the response describes post-merge state and the
// client's next watermark covers its own rows. ---
let mut upstream_ack: Option<i64> = None;
if let Some(upstream) = request.upstream_delta {
    validate_envelope(&upstream)?; // format_version 검사 — merge_data의 validate와 동일 기준
    let summary = core
        .apply_delta(&upstream)
        .map_err(|error| error.to_string())?;
    let _ = summary; // 행 수는 로깅만
    upstream_ack = Some(core.max_merge_clock().map_err(|e| e.to_string())?);
}
```

주의: 기존 full 경로(`request.snapshot`)는 이미 `merge_data`로 상행을 처리하므로 `upstream_delta`와 `snapshot`이 동시에 오면 **에러로 거절한다** (프로토콜 오류). `since_watermark`와는 공존 가능(하행+상행 동시 교환).

`upstream_ack`는 delta/full 어느 응답에도 실어 반환. 병합이 실제 행을 썼으면 기존과 동일하게 `take_data_dirty()` + `sync-complete` 이벤트 발화(그래프 자동재분석 트리거).

**Step 4: 사전 백업 훅**

Task 6에서 별도 구현하되, 이 함수 호출 지점만 확보:

```rust
if request.upstream_delta.is_some() || request.snapshot.is_some() {
    backup_db_before_sync(&state.app)?; // Task 6에서 구현
}
```

**Step 5: cargo test 통과**

Run: `cargo test -p glimpse-desktop 2>&1 | tail -5`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/desktop/src-tauri
git commit -m "feat(desktop): sync 서버가 상행 델타 병합·upstreamAck 반환"
```

---

### Task 6: 사전 동기화 DB 백업 (장애 복구 안전망)

**Files:**
- Create: `apps/desktop/src-tauri/src/sync/backup.rs`
- Modify: `apps/desktop/src-tauri/src/sync/mod.rs` (mod 선언)
- Test: `apps/desktop/src-tauri/src/sync/backup.rs` tests 모듈

**Step 1: 실패 테스트**

```rust
// 1. 백업 생성 → backups/pre-sync/에 파일 존재, 크기 > 0
// 2. 롤링 보관 — 6회 생성 시 최대 5개 유지, 가장 오래된 것 삭제
// 3. 백업 실패가 동기화를 막지 않는다 — 실패 시 Ok 반환 (백업은 최선 노력)
//    단, eprintln으로 기록
```

**Step 2: 구현**

```rust
use std::fs;
use std::path::{Path, PathBuf};

/// Rolling pre-sync backups of the desktop DB. Created BEFORE any merge
/// (apply_delta/merge_data) so a corrupt merge, crash, or power loss always
/// has a file-level restore point. Best-effort: a backup failure never
/// blocks the sync itself — SQLite transactions remain the primary
/// guarantee, this is the second net.
const BACKUP_DIR: &str = "backups/pre-sync";
const MAX_BACKUPS: usize = 5;

pub fn backup_db_before_sync(app_data_dir: &Path) -> std::io::Result<PathBuf> {
    let dir = app_data_dir.join(BACKUP_DIR);
    fs::create_dir_all(&dir)?;
    let stamp = chrono::Utc::now().timestamp_millis();
    let dest = dir.join(format!("glimpse-core-{stamp}.db"));
    fs::copy(&app_data_dir.join("glimpse-core.db"), &dest)?;
    // WAL/SHM도 복사해 진행 중 트랜잭션 손실 최소화
    for suffix in ["-wal", "-shm"] {
        let source = app_data_dir.join(format!("glimpse-core.db{suffix}"));
        if source.exists() {
            let _ = fs::copy(&source, dest.with_file_name(format!("glimpse-core-{stamp}.db{suffix}")));
        }
    }
    prune_old_backups(&dir)?;
    Ok(dest)
}

fn prune_old_backups(dir: &Path) -> std::io::Result<()> {
    let mut backups: Vec<_> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().is_some_and(|ext| ext == "db"))
        .collect();
    backups.sort_by_key(|e| e.file_name());
    while backups.len() > MAX_BACKUPS {
        let oldest = backups.remove(0);
        let _ = fs::remove_file(oldest.path());
    }
    Ok(())
}
```

`ServerState`에 `app_data_dir` 전달 필요 — `sync/mod.rs`의 `ServerState` 구성에 추가하고 `sync` 핸들러에서 사용. (tauri `app.path().app_data_dir()`은 이미 main.rs에서 받고 있으므로 그 값을 ServerState로 전달.)

**Step 3: cargo test**

Run: `cargo test -p glimpse-desktop backup 2>&1 | tail -3`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/desktop/src-tauri
git commit -m "feat(desktop): 동기화 전 DB 사전 백업(롤링 5개) 추가"
```

---

### Task 7: 델타 크기 한도 + 전체 스냅샷 폴백

**Files:**
- Modify: `apps/mobile/src/features/sync/sync-client.ts` (upstreamDeltaPromise 주변)
- Test: `apps/mobile/src/features/sync/sync-client.upstream.test.ts`에 케이스 추가

**Step 1: 실패 테스트**

```typescript
// 델타 JSON 직렬화 크기가 10MB 초과 → upsertedDelta 대신 전체 스냅샷 경로로 폴백
// (watermark 무시하고 exportData → requestBody.snapshot)
```

**Step 2: 구현**

```typescript
const UPSTREAM_DELTA_LIMIT_BYTES = 10 * 1024 * 1024;

// exportDelta 결과가 한도 초과면 폴백: watermark를 null로 바꿔 전체 경로 유도
let effectiveWatermark = watermark;
const upstream = await upstreamDeltaPromise?.catch(() => null);
if (upstream && JSON.stringify(upstream).length * 2 > UPSTREAM_DELTA_LIMIT_BYTES) {
  effectiveWatermark = null; // full path
}
```

(정확한 구현은 기존 snapshotPromise 지연 로딩 구조와 조화시킨다.)

**Step 3: bun test**

Run: `bun test apps/mobile/src/features/sync`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/mobile/src/features/sync
git commit -m "feat(mobile): 상행 델타 크기 한도 초과 시 전체 스냅샷 폴백"
```

---

### Task 8: 변경 기반 트리거 + 적응형 폴링

**Files:**
- Modify: `apps/mobile/src/hooks/useAutoSync.ts`
- Test: Create `apps/mobile/src/hooks/useAutoSync.test.ts` (패턴: 기존 hooks 테스트 참조)

**Step 1: 테스트 작성 (순수 로직 함수로 분리해 테스트)**

디바운스/백오프 상태 머신을 순수 함수로 추출(`sync-schedule.ts` 신규):

```typescript
// 1. 변경 감지 → 2초 디바운스 후 sync 호출
// 2. 연속 변경은 디바운스 리셋 (마지막 변경 후 2초)
// 3. "변화 없음" 응답 → 다음 폴링 간격 배가 (60초 → 120 → 240 → 최대 300초)
// 4. "변화 있음" → 간격 60초 리셋
// 5. sync 실패 → 기존 backoff 컨트롤러에 위임 (신규 로직 없음)
```

**Step 2: sync-schedule.ts 구현 + useAutoSync에서 사용**

```typescript
// sync-schedule.ts
export const BASE_POLL_MS = 60_000;
export const MAX_POLL_MS = 5 * 60_000;
export const CHANGE_DEBOUNCE_MS = 2_000;

export function nextPollIntervalMs(currentMs: number, changed: boolean): number {
  if (changed) return BASE_POLL_MS;
  return Math.min(currentMs * 2, MAX_POLL_MS);
}
```

useAutoSync는 `syncWithDesktop()` 결과(`changed`)로 간격 조정 + `mobileCoreClient.syncDataRevision?()` 폴링으로 로컬 변경 감지(리비전 변화 시 디바운스 sync). 기존 1초 초기 지연·AppState resume 트리거 유지.

**Step 3: bun test + lint**

Run: `bun test apps/mobile && bun run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): 변경 기반 동기화 트리거·적응형 폴링 간격"
```

---

### Task 9: 전체 스냅샷 화해 주기 10분 → 30분

**Files:**
- Modify: `apps/mobile/src/features/sync/sync-client.ts:57` (FULL_SYNC_EVERY_MS)
- Modify: `apps/mobile/src/features/sync/sync-client.ts` 주석 갱신

**Step 1: 상수·주석 변경**

상행 델타 경로가 이제 변경 전파를 담당하므로:

```typescript
/**
 * How often a watermarked client deliberately skips the incremental path and
 * uploads a full snapshot anyway. Upstream deltas now carry mobile-side
 * edits within seconds (ack-cursor based), so reconciliation only reseals
 * accumulated drift: clock-skew gaps beyond the 24h guardband, missed
 * tombstone prunes, and any legacy-peer fallback. 30 minutes bounds the
 * drift window while 5 of 6 polls stay at KB scale.
 */
const FULL_SYNC_EVERY_MS = 30 * 60 * 1000;
```

**Step 2: 기존 watermark 테스트의 FULL_SYNC 관련 케이스 확인**

Run: `bun test apps/mobile/src/features/sync`
Expected: PASS (테스트가 상수를 직접 참조하면 함께 갱신)

**Step 3: Commit**

```bash
git add apps/mobile/src/features/sync
git commit -m "refactor(mobile): 전체 스냅샷 화해 주기 10분→30분 (상행 델타가 전파 담당)"
```

---

### Task 10: 문서 갱신 + 전체 게이트

**Files:**
- Modify: `docs/desktop-mobile-sync.md`
- Modify: `apps/mobile/src/features/sync/sync-client.ts` 주석 (FULL_SYNC_EVERY_MS 위 설명)

**Step 1: 문서 갱신**

`docs/desktop-mobile-sync.md`의 "Automatic sync" 섹션에 추가:

```markdown
- Sync is bidirectional and incremental in both directions: mobile changes
  (captures, chats, review actions) ship to the desktop as an upstream delta
  within seconds of a successful round-trip; desktop changes flow down via
  the watermark delta. The client's upstream cursor advances only after the
  server confirms the merge (ack-based), so a failed transfer re-sends the
  same rows — LWW merging makes retries idempotent.
- Before every merge (full snapshot or upstream delta) the desktop copies its
  database to `backups/pre-sync/` (rolling, 5 kept) as a file-level restore
  point.
```

**Step 2: 전체 게이트**

Run: `cargo test 2>&1 | tail -3 && bun test 2>&1 | tail -3 && bun run lint 2>&1 | tail -3 && bun run typecheck 2>&1 | tail -3`
Expected: 전부 PASS

**Step 3: 시뮬레이터 수동 E2E 게이트** (사용자 안내용 — 완료 기준)

1. `bun run desktop:dev` + `bun run ios`
2. 모바일 캡처 → 데스크톱 라이브러리 수 초 내 표시 확인
3. 모바일 채팅 전송 → 데스크톱 채팅 목록 반영 확인
4. 어느 쪽 복습 완료 → 양쪽 스케줄 일치 확인
5. 동기화 직후 데스크톱 강제 종료 → 재시작 시 데이터 이상 없음 + `backups/pre-sync/` 존재 확인
6. 네트워크 단절(기기 와이파이 off) 중 모바일 캡처 → 복구 후 자동 전파 확인

**Step 4: Commit**

```bash
git add docs/desktop-mobile-sync.md
git commit -m "docs: 양방향 즉시 전파 동기화 문서 갱신"
```

---

## 검증 범위 명시

- **시뮬레이터 검증 가능**: Task 10의 E2E 게이트 1~6
- **실기기 잔여** (기존 과제와 동일): OS 백그라운드 태스크에서의 상행 델타, Android 실기기
- **명시적 범위 외**: 리마인더 설정 동기화, 데스크톱 캡처 동선(후속 설계 후보)
