# 일관성 수리 구현 플랜 (Consistency Remediation Implementation Plan)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 감사(`thoughts/shared/research/2026-08-30_22-49-26_full-consistency-audit.md`)에서 발견된 4영역 불일치를 수리한다 — P0 공유 인텐트 배선, 쿼리 무효화 정합, rustra(sync_plan·iOS dnssd) 전환, 데드 코드 삭제, 모바일 다크 모드 완전 구현, UI 패턴 통합, 문서 동기화.

**Architecture:** 설계 문서 `docs/plans/2026-08-30-consistency-remediation-design.md`의 A~D 파트를 14개 태스크로 분해. 각 태스크는 독립 커밋 단위이며 TDD(가능한 경우)·게이트(`bun run lint` + `bun test`)를 통과해야 다음으로 진행. Part B 태스크는 착수 전 최신 rustra 릴리스 확인이 전제.

**Tech Stack:** Expo RN (uniwind/unocss-like CSS 변수 테마), @tanstack/react-query, zustand, rustra bridge (packages/bridge-rust + generated TS), Rust (jni/dnssd), Tauri desktop.

---

## Part A — 기능 결함 수리

### Task 1: recommendations 무효화 정렬 (모바일)

**Files:**
- Modify: `apps/mobile/src/lib/query-keys.ts` (graph 토큰 추가)
- Modify: `apps/mobile/src/hooks/mutations/useRecommendationActions.ts:59-62`
- Modify: `apps/mobile/src/hooks/mutations/useCaptureActions.ts:56-60,110-117`
- Modify: `apps/mobile/src/hooks/useAppForegroundRecommendations.ts` (refresh 내부)
- Test: `apps/mobile/src/test/` 내 기존 패턴 따르는 신규 테스트 불필요 — mutation onSuccess는 react-query 래퍼라 훅 단위 테스트로 검증 어려움. 대신 lint+타입+수동 smoke. 단, `queryKeys.recommendations.graph` 존재는 컴파일로 검증.

**Step 1: query-keys에 graph 토큰 추가**

`apps/mobile/src/lib/query-keys.ts`의 recommendations 블록을 다음과 같이 수정 (weekly는 Task 11에서 삭제 예정이므로 지금은 유지):

```ts
  recommendations: {
    all: ['recommendations'] as const,
    pending: ['recommendations', 'pending'] as const,
    weekly: ['recommendations', 'weekly'] as const,
    graph: ['recommendations', 'graph'] as const,
  },
```

**Step 2: 무효화를 recommendations.all로 통일**

4곳의 `queryClient.invalidateQueries({ queryKey: queryKeys.recommendations.pending })`를 모두 `queryKey: queryKeys.recommendations.all`로 변경 (프리픽스 매칭으로 pending/graph/all 전부 커버 — 데스크톱 `useRecommendationMutations.ts:20` 패턴과 동일):

- `useRecommendationActions.ts` onSuccess
- `useCaptureActions.ts`의 `useSaveKnowledgeItemMutation` onSuccess
- `useCaptureActions.ts`의 `useDeleteKnowledgeItemMutation` onSuccess
- `useAppForegroundRecommendations.ts`의 refresh 내 invalidateQueries

**Step 3: 게이트**

Run: `bun run lint && bun test apps/mobile/src/hooks apps/mobile/src/hooks/queries 2>/dev/null || bun test`
Expected: lint 통과, 테스트 그린.

**Step 4: Commit**

```bash
git add -A && git commit -m "fix(mobile): recommendations 무효화를 all 프리픽스로 통일 — pending만 무효화하던 4곳 수리"
```

---

### Task 2: 데스크톱 detail 쿼리 갱신

**Files:**
- Modify: `packages/hooks/src/mutations/useReviewMutations.ts:41-54`
- Test: `packages/hooks/src/mutations/useReviewMutations.test.ts` (없으면 신규)

**Step 1: 실패하는 테스트 작성**

`patchKnowledgeItemInList`가 detail 키도 무효화하는지 검증하는 테스트를 패키지 테스트 패턴에 맞춰 작성:

```ts
// queryClient spy로 setQueryData(['knowledgeItems']) 호출 후
// invalidateQueries가 queryKey ['knowledgeItems','detail',itemId] 프리픽스를
// 타겟으로 하는지 검증
it('invalidates the knowledgeItems detail query for the patched item', () => {
  // arrange: renderHook + useMarkAsReviewedMutation, coreClient mock
  // act: mutate({ item })
  // assert: qc.invalidateQueries가 { queryKey: ['knowledgeItems', 'detail', item.id] }와 매칭되는 키로 호출됨
});
```

**Step 2: 테스트 실패 확인**

Run: `bun test packages/hooks/src/mutations`
Expected: FAIL — detail 무효화 없음.

**Step 3: 구현**

`patchKnowledgeItemInList` 끝에 추가:

```ts
  qc.invalidateQueries({ queryKey: queryKeys.knowledgeItems.detail(item.id) });
```

**Step 4: 테스트 통과 확인**

Run: `bun test packages/hooks/src/mutations`
Expected: PASS.

**Step 5: Commit**

```bash
git add -A && git commit -m "fix(desktop): 복습 뮤테이션이 knowledgeItems detail 쿼리를 무효화하도록 수리"
```

---

### Task 3: no-op 무효화 정리 (`['models','available']`)

**Files:**
- Modify: `apps/desktop/src/features/local-llm/use-model-management.ts:132,147,162,178,193`

**Step 1: 무효화 대상 교체**

5곳의 `queryClient.invalidateQueries({ queryKey: ['models', 'available'] })`(팩토리 참조 형태는 `queryKeys.models.available`일 수 있음 — 파일 내 실제 참조 형태 확인 후)를 `['llm','overview']` (파일 내 `llmOverviewKey` 또는 해당 상수)로 교체.

주의: 다운로드 이벤트(`model:download-progress/done/failed`) 리스너가 이미 overview를 갱신하는지 확인하고, 이벤트가 커버한다면 무효화 삭제가 정답. 이벤트가 progress만 주고 최종 상태를 쿼리에 반영하지 않으면 overview 무효화 유지.

**Step 2: 데드 `models.available` 키 정의 삭제**

`queryKeys.models` 블록(및 모바일 팩토리에 동일 키 있으면 함께) 삭제 — Task 11과 겹치므로 이 태스크에서는 무효화 교체만, 키 삭제는 Task 11에서 일괄.

**Step 3: 게이트**

Run: `bun run lint && bun test`
Expected: 그린.

**Step 4: Commit**

```bash
git add -A && git commit -m "fix(desktop): models.available no-op 무효화 5곳을 llm overview로 교체"
```

---

### Task 4: 공유 인텐트 프리필 배선 (P0)

**핵심 발견 (플랜 작성 중 확인):** 살아있는 캡처 UI는 `UnifiedCaptureForm`(title/body/imageUri)이고 `useCaptureFormState`는 구 폼 5종용 리듀서 체계. 따라서 **구 체계로 화면을 전환하지 않고**, `expo-share-intent` 컨텍스트를 `capture.tsx`에서 직접 소비해 `UnifiedCaptureFormState`로 매핑한다. 구 체계(`useCaptureFormState`, 리듀서, parseShareIntent)는 Task 10에서 데드 코드로 삭제.

**역할 분리 (설계 확정 사항):**
- Share Extension 적립분 중 `_directSave` 플래그 없는 일반 공유 → `expo-share-intent`가 앱을 열고 share intent를 제공 → capture 폼 프리필
- Shortcuts/quick note(`_directSave`) → 기존 `useProcessPendingShares` 자동 저장 유지 (변경 없음)
- `pending-share-processor`는 이미 App Group UserDefaults(`getPendingShareData`)만 처리하므로 expo-share-intent 경로와 충돌 없음 — 코드 확인 결과 둘은 다른 저장소를 읽음

**Files:**
- Modify: `apps/mobile/app/capture.tsx`
- Create: `apps/mobile/src/features/capture/form/intent-to-form.ts` + `.test.ts`

**Step 1: 매핑 순수 함수 TDD**

```ts
// intent-to-form.ts
import type { UnifiedCaptureFormState } from '@/src/components/capture';
import type { SharedContent } from './types';

/**
 * expo-share-intent가 전달한 공유 콘텐츠를 통합 캡처 폼 상태로 매핑한다.
 * URL이 있으면 body에 URL(웹 메타데이터 fetch는 폼이 기존 로직으로 처리),
 * 텍스트가 있으면 body, 이미지가 있으면 imageUri.
 */
export function shareIntentToFormState(shared: {
  text?: string | null;
  webUrl?: string | null;
  files?: { path: string }[] | null;
}): Partial<UnifiedCaptureFormState> {
  const next: Partial<UnifiedCaptureFormState> = {};
  if (shared.webUrl) next.body = shared.webUrl;
  else if (shared.text) next.body = shared.text;
  if (shared.files?.length) next.imageUri = shared.files[0]?.path ?? null;
  return next;
}
```

테스트 먼저 작성(`intent-to-form.test.ts`): URL만/텍스트만/둘 다/이미지/빈 케이스. 실패 확인 → 구현 → 통과.

**Step 2: capture.tsx 배선**

```tsx
import { useShareIntentContext } from 'expo-share-intent';
import { shareIntentToFormState } from '@/src/features/capture/form/intent-to-form';

// CaptureScreen 내부:
const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

useEffect(() => {
  if (!hasShareIntent || !shareIntent) return;
  setFormState((prev) => ({
    ...prev,
    ...shareIntentToFormState({
      text: shareIntent.text ?? null,
      webUrl: shareIntent.webUrl ?? null,
      files: shareIntent.files ?? null,
    }),
  }));
  resetShareIntent();
}, [hasShareIntent, shareIntent, resetShareIntent]);
```

(shareIntent의 실제 필드명은 `expo-share-intent` v8 타입 정의를 확인해 정렬 — `text`/`webUrl`/`files` 외 `title`이 있으면 title 프리필 추가.)

**Step 3: 게이트**

Run: `bun run lint && bun test apps/mobile/src/features/capture`
Expected: 그린.

**Step 4: 수동 smoke**

`bun run ios` 시뮬레이터 — 다른 앱에서 텍스트 공유 → capture가 열리며 body 프리필 확인.

**Step 5: Commit**

```bash
git add -A && git commit -m "fix(mobile): 공유 인텐트가 캡처 폼에 프리필되도록 배선 (P0)"
```

---

## Part B — rustra 전환

> **⚠️ 착수 전제 (사용자 지시):** 새 rustra가 곧 로컬 배포될 예정. Task 5·6 착수 직전에 반드시:
> 1. 최신 rustra 릴리스/버전 확인 (`@rustra/types` 오버라이드 버전, `packages/bridge-rust/package.json`)
> 2. 새 버전이면 `bun run bridge:generate`로 생성물 재생성 후 diff 확인
> 3. sync_plan·sync_discover 커맨드 시그니처가 변경됐으면 아래 코드를 그에 맞춰 조정
> 커밋 메시지에 확인한 rustra 버전을 명시한다.

### Task 5: sync_plan TS → Rust 전환

**현재 상태 (3928e06 기준):**
- TS: `sync-url.ts`(normalizeBaseUrl/discoveryBaseUrl/endpointCandidates + HttpError/isAuthError), `backoff.ts`(createBackoffController/recordSuccess/recordFailure/isHoldingOff)
- Rust 생성 클라이언트: `normalizeBaseUrl(value)→{url}`, `discoveryBaseUrl({host,port})→{url}`, `endpointCandidates({tailscaleUrl,lanUrl})→{endpoints}`, `recordSyncSuccess({state})→{state}`, `recordSyncFailure({state,now,authRejected?})→{state}`, `isHoldingOff({state,now,force?})→{holdingOff}`, `BackoffState={failures,invalidated,holdUntil}` (`packages/bridge-rust/generated/types.ts:56-63`)
- 소비처: `sync-client.ts`(백오프 컨트롤러 모듈 상태), `pairWithDesktop`(normalizeBaseUrl), `rediscoverPairedDesktop`(discoveryBaseUrl), `background-task.ts`(isSyncInBackoff), `sync/index.ts`(배럴 재노출)

**Files:**
- Modify: `apps/mobile/src/features/sync/sync-client.ts`
- Modify: `apps/mobile/src/features/sync/index.ts` (배럴 정리)
- Modify: `apps/mobile/src/features/sync/background-task.ts` (필요시)
- Delete: `apps/mobile/src/features/sync/backoff.ts`, `sync-url.ts`의 함수부 (HttpError/isAuthError는 유지 — 순수 타입/클래스)
- Delete: `apps/mobile/src/features/sync/backoff.test.ts`, `sync-url.test.ts` (로직 테스트 → 브리지 mock 테스트로 교체)
- Modify: `packages/shared/src/backoff.ts` 소비처 확인 후 삭제 (데스크톱에서 `backoffRetryAfterMs` 소비하는 곳 있으면 유지)
- Test: `apps/mobile/src/features/sync/sync-client.*.test.ts` 갱신

**Step 1: 상태 타입 전환**

`sync-client.ts`의 `BackoffController` 모듈 상태를 `BackoffState`(생성 타입)로 교체:

```ts
import {
  isHoldingOff as isHoldingOffCmd,
  normalizeBaseUrl as normalizeBaseUrlCmd,
  discoveryBaseUrl as discoveryBaseUrlCmd,
  endpointCandidates as endpointCandidatesCmd,
  recordSyncFailure,
  recordSyncSuccess,
} from '@glimpse/bridge-generated';

let backoffState: BackoffState = { failures: 0, invalidated: false, holdUntil: 0 };
```

**Step 2: 호출부 비동기화**

- `pairWithDesktop`: `const normalized = (await normalizeBaseUrlCmd({ value: baseUrl })).url;`
- `runSync`: `let candidates = (await endpointCandidatesCmd(config)).endpoints;`
- `rediscoverPairedDesktop`: `const lanUrl = (await discoveryBaseUrlCmd({ host: paired.host, port: paired.port })).url;`
- 성공/실패 기록:
  - `backoffState = (await recordSyncSuccess({ state: backoffState })).state;`
  - `backoffState = (await recordSyncFailure({ state: backoffState, now, authRejected })).state;`
- 홀드오프 판정은 매 호출 브리지 대신 **마지막 기록 시점의 state를 저장**해 두고 `isSyncInBackoff`는 비동기 문제가 되므로: `runSync` 진입 시 `const holding = (await isHoldingOffCmd({ state: backoffState, now: Date.now(), force: options.force })).holdingOff;`로 판정. `background-task.ts`의 `isSyncInBackoff()`는 동기 인터페이스 — 브리지 상태를 모듈이 소유하므로 `background-task`가 `syncWithDesktop({force:true})`가 아닌 스킵 판정을 하려면, 마지막 `runSync` 종료 시점에 계산된 홀드오프 여부를 모듈 변수로 캐시(`lastHoldOffCheck`)하는 방식으로 유지. 구현 시 테스트로 잠금.

**Step 3: web/브리지 미가용 폴백**

`initializeCore` 선례 확인(`apps/mobile/src/features/core/rustra-core-client.ts:22-26`) — 브리지 invoke가 reject하면 기존 TS 로직을 유지하는 폴백은 추가하지 않는다(이중 구현 재발 방지). 대신 `runSync`는 브리지 실패 시 동기화 자체를 실패 처리(sync runtime error) — 웹은 애초에 sync 미지원(`index.web.ts`).

**Step 4: 테스트 갱신**

`sync-client.*.test.ts`에서 backoff/url 모듈 mock을 `@glimpse/bridge-generated` mock으로 교체. 기존 기대값(백오프 지수 계산 등)은 브리지가 소유하므로 TS 테스트에서는 "브리지가 반환한 state를 저장한다" 계약만 검증.

**Step 5: 게이트 + 삭제**

Run: `bun run lint && bun test`
그린이면 `sync-url.ts` 함수부·`backoff.ts`·각 테스트 삭제, `sync/index.ts` 배럴에서 함수 재노출 제거(HttpError/isAuthError 유지). `packages/shared/src/backoff.ts`는 소비처 grep 후 없으면 삭제.

**Step 6: Commit**

```bash
git add -A && git commit -m "refactor(mobile): sync_plan 6커맨드를 rustra 브리지로 전환 — TS 중복 구현 제거 (rustra vX.Y)"
```

---

### Task 6: iOS discovery → Rust dnssd 경로

**현재 상태:** `modules/sync-discovery/src/index.ts`(iOS, Swift 네이티브 모듈, 클램프 [500,10000]) vs `index.android.ts`(브리지, 클램프 [500,5000]) vs Rust 클램프 [100,5000].

**Files:**
- Create: `apps/mobile/modules/sync-discovery/src/index.ios.ts`
- Modify: `apps/mobile/modules/sync-discovery/src/index.ts` → 삭제 (iOS 진입점이 index.ios.ts로 대체됨 — RN Metro 플랫폼 해석 규칙: `index.ios.ts`가 `index.ts`보다 우선)
- Delete: `apps/mobile/modules/sync-discovery/ios/` (Swift 모듈)
- Modify: `apps/mobile/app.json`의 expo-modules 관련 설정에 Swift 모듈 참조 있으면 정리
- 유지: Info.plist `NSBonjourServices`/`NSLocalNetworkUsageDescription` (Rust dnssd도 동일 시스템 서비스 사용)

**Step 0: 착수 전 확인 (플랜 상 명시)**

1. rustra 최신 버전 확인 (Task 5 전제와 동일)
2. `packages/bridge-rust` iOS 빌드 체인: `apps/mobile/ios` podspec/xcframework 빌드 스크립트가 iOS aarch64 타깃으로 bridge-rust를 빌드하는지 확인. `dnssd.rs`가 `#[cfg(target_os = "ios")]`로 포함되는지(`sync_discovery/mod.rs:10`) cargo check로 검증:
   Run: `cd packages/bridge-rust && cargo check --target aarch64-apple-ios`
   실패하면 **롤백 지점**: Swift 경로를 유지하고 Task 6은 "dnssd iOS 빌드 체인 정비" 이슈로 분리 보고.

**Step 1: index.ios.ts 작성 (Android 어댑터 복제 + 플랫폼 가드 변경)**

```ts
import { Platform } from 'react-native';
import { syncDiscover } from '@glimpse/bridge-generated';
import { discoveryUnavailableError } from './discovery-unavailable';

export type DiscoveredSyncDesktop = {
  name: string;
  host: string;
  port: number;
  deviceId: string | null;
  protocolVersion: number;
};

export { discoveryUnavailableError };

/**
 * iOS routes discovery through the shared Rust `sync_discover` command
 * (dnssd backend). The command needs the JSI bridge installed; until then
 * `invoke` rejects, which the caller surfaces as the explicit unavailable
 * state (same contract as a missing native module).
 */
export function isSyncDiscoveryAvailable(): boolean {
  return Platform.OS === 'ios';
}

export async function discoverSyncDesktops(
  timeoutMs: number = 2_500,
): Promise<DiscoveredSyncDesktop[]> {
  if (Platform.OS !== 'ios') {
    throw new Error(discoveryUnavailableError);
  }
  const output = await syncDiscover({
    timeoutMs: Math.min(Math.max(timeoutMs, 500), 5_000),
  });
  return output.peers.map((peer) => ({
    name: peer.name,
    host: peer.host,
    port: peer.port,
    deviceId: peer.deviceId === '' ? null : peer.deviceId,
    protocolVersion: peer.protocolVersion,
  }));
}
```

(클램프 하한 500은 유지 — Rust가 [100,5000]이지만 TS 어댑터 계약은 [500,5000]으로 양 플랫폼 통일. Rust 하한 100은 브리지 내부 방어.)

**Step 2: 기존 index.ts 삭제, Swift 모듈 삭제**

- `git rm apps/mobile/modules/sync-discovery/src/index.ts apps/mobile/modules/sync-discovery/ios -r`
- `index.web.ts` 유지 (웹은 불가 상태 명시)
- `sync-discovery` 모듈의 expo-module.config.json / podspec이 Swift 모듈을 가리키면 정리

**Step 3: 게이트 + 스모크**

Run: `bun run lint && bun test`
Run: `bun run ios` (시뮬레이터) → 설정 > Desktop 동기화 > 탐색 — 데스크톱 앱(mdns-sd 광고)이 떠 있으면 발견 확인.

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor(ios): discovery를 Rust dnssd syncDiscover 경로로 전환 — Swift 네이티브 모듈 제거 (rustra vX.Y)"
```

---

## Part C — 데드 코드 삭제 + UI 정합

### Task 7: 데드 UI·훅·스토어 삭제

**Files (전부 임포터 0건 — 감사에서 확인):**
- Delete: `apps/mobile/src/components/capture/CaptureForm.tsx`, `CaptureChannelForm.tsx`, `HighlightForm.tsx`, `ScreenshotForm.tsx`, `ShareForm.tsx`, `ChannelSegment.tsx`
- Modify: `apps/mobile/src/components/capture/index.ts` — 삭제 컴포넌트 재노출 제거 (UnifiedCaptureForm·CaptureSaveButton 등 살아있는 것만)
- Delete: `apps/mobile/src/components/settings/LocalLLMSection.tsx`, `AppleIntelligenceSection.tsx` (`appleIntelligenceToggle.ts`는 생존 — 유지)
- Delete: `apps/mobile/src/features/capture/form/reducer.ts`의 미사용 액션 정리 — 단 Task 4에서 UnifiedCaptureForm 직접 매핑으로 전환했으므로 `useCaptureFormState.ts`+`useCaptureFormState.web.ts`+`form/reducer.ts`+`form/shareIntent.ts`+`form/types.ts` 전체가 데드가 되는지 재확인 후 삭제. `buildSaveInput.ts`는 다른 소비처 확인 후 유지/삭제.
- Delete: `apps/mobile/src/hooks/mutations/useCaptureActions.ts`의 `useCaptureActionsMutation` (조합기만 — 개별 `useSaveKnowledgeItemMutation`·`useUpdateKnowledgeItemMutation`·`useDeleteKnowledgeItemMutation`은 소비처 있음)
- Delete: `apps/mobile/src/features/core/local-core-store.ts`
- Delete: `apps/mobile/src/features/share/pending-share-processor.ts`의 `processPendingSharesNow` (훅은 유지)
- Delete: `apps/mobile/src/utils/app-group-path.ts`의 `getAppGroupContainerPathSync`
- Delete: `apps/mobile/src/features/core/initialize-core-client.native.ts`의 `getCoreDbPath` + 웹 변형 동명 함수
- Delete: `apps/mobile/src/lib/constants.ts` (`NAV_THEME` — 참조 0건)
- Delete: `apps/mobile/src/lib/icons/` (iconWithClassName — 소비처 0건 확인 완료)

**각 삭제마다:** `grep -rn "<심볼명>" apps/mobile packages --include="*.ts*" | grep -v test`로 소비처 0건 재확인 후 삭제. 테스트 파일도 함께 삭제.

**Step 1: 삭제 + 재확인 위 순서로 일괄 수행**

**Step 2: 게이트**

Run: `bun run lint && bun test && bun run ios` (웹/안드는 최종 게이트에서)
Expected: 그린 (미사용 export 경고 등 없음).

**Step 3: Commit**

```bash
git add -A && git commit -m "chore(mobile): 임포터 0건 데드 코드 삭제 — 구 캡처 폼 6종·미사용 섹션·조합기·사코드"
```

---

### Task 8: 쿼리 키 데드 정의 + 고아 이벤트 정리

**Files:**
- Modify: `apps/mobile/src/lib/query-keys.ts` — `recommendations.weekly`, `chat.conversation` 삭제
  - 주의: `useChatMutations.ts:159-161`가 `chat.conversation(id)`를 removeQueries로 사용 — **이 사용처는 유지 가치 판단**: removeQueries 대상이 되려면 키가 존재해야 의미가 있으나 라이브 쿼리가 없으므로 removeQueries 자체가 no-op → 해당 removeQueries 라인도 함께 삭제
- Modify: `packages/hooks/src/query-keys.ts` — `recommendations.weekly` 삭제
- Modify: `packages/hooks/src/local-llm/use-desktop-llm-overview.ts:9-11` — `llmQueryKeys.health/models/runtimes` 삭제 (사용처 확인 후)
- Modify: `apps/desktop/src-tauri/src/commands.rs:190-197` — `emit_llm_done` 호출 제거 (`llm:stream-done` 고아 emit). Rust 변경이므로 데스크톱은 `tauri dev` 재시작 필요 (메모리 선례)
- Modify: `apps/mobile/src/features/ai/stream-events.ts` — `llm:stream-done`/`llm:stream-token` 구독 헬퍼 중 `subscribeStreamDone` 소비처 재확인: llama-service.ts 재수출과 테스트만이면 토큰/완료 모두 JS 프라미스 기반으로 동작 중이므로 **정의는 유지하되 주석으로 계약 명시**하거나, 감사 결과에 따라 삭제 판단. 안전 측에서 정의 유지 + 소비처 없음 주석.
- Delete: `apps/mobile/src/hooks/mutations/useChatMutations.ts:159-161` 부근 removeQueries 라인

**Step 1~3: 정리 → 게이트(`bun run lint && bun test`) → 커밋**

```bash
git add -A && git commit -m "chore: 데드 쿼리 키 정의·no-op removeQueries·llm:stream-done 고아 emit 제거"
```

---

### Task 9: QueryStateScrollView 레이어 수리

**Files:**
- Modify: `packages/ui/src/common/QueryStateScrollView.tsx:51,111` — 한국어 기본 카피 제거
- Modify: `apps/mobile/app/(tabs)/review.tsx:96`, `(tabs)/digest.tsx:34` — 카피 주입

**Step 1: 인터페이스 변경**

```ts
type QueryStateScrollViewProps<T> = {
  ...
  loadingText: string; // optional 제거 — 호출처가 반드시 주입
```

`loadingText = "로딩 중..."` 기본값 제거. review.tsx·digest.tsx에서 각 화면 문자열 주입 (review: `'불러오는 중...'`, digest 동일 — `useAppLocale`의 messages 카탈로그에 있으면 카탈로그 문자열 사용, 없으면 리터럴).

**Step 2: 게이트 + 커밋**

Run: `bun run lint && bun test && bun run web` (QueryStateScrollView는 common 레이어라 웹에도 노출)
```bash
git add -A && git commit -m "refactor(ui): QueryStateScrollView에서 고정 한국어 카피 제거 — 호출처 주입으로"
```

---

### Task 10: 모바일 다크 모드 — 토큰·전환·네이티브

**Files:**
- Modify: `packages/ui/styles/globals.css` — `.dark` 블록 추가
- Modify: `apps/mobile/src/lib/useColorScheme.ts` — 실제 전환 구현
- Create: `apps/mobile/src/stores/settings/theme.store.ts` + `.test.ts`
- Modify: `apps/mobile/app/settings.tsx` — ThemeSection 추가
- Create: `apps/mobile/src/components/settings/ThemeSection.tsx`
- Modify: `apps/mobile/src/lib/init.ts` (또는 `_layout.tsx`) — 부팅 시 저장된 프리퍼런스 적용

**Step 1: `.dark` 토큰 블록 (데스크톱과 동일 팔레트)**

`packages/ui/styles/globals.css`의 `@theme` 블록 뒤에 추가. uniwind의 `.dark` 변형 해석은 `@import "uniwind"`가 담당 (`uniwind.d.ts`가 이미 `themes: ['light','dark']` 선언):

```css
.dark {
  --color-app-bg: #191919;
  --color-app-surface: #242424;
  --color-app-card: #242424;
  --color-app-border: rgba(255, 255, 255, 0.08);
  --color-app-text: #e3e2de;
  --color-app-muted: #9b9a97;
  --color-app-subtle: #686764;
  --color-app-primary: #529cca;
  --color-app-accent: #eb5757;

  --color-tag-mint-bg: #1c3829;
  --color-tag-mint-text: #7ee787;
  --color-tag-peach-bg: #3d2618;
  --color-tag-peach-text: #ffa657;
  --color-tag-sky-bg: #1a2f4c;
  --color-tag-sky-text: #79c0ff;
  --color-tag-lavender-bg: #2d2244;
  --color-tag-lavender-text: #d2a8ff;
  --color-tag-rose-bg: #3c1e28;
  --color-tag-rose-text: #ff7b72;
  --color-tag-neutral-bg: #2b2b2b;
  --color-tag-neutral-text: #c9d1d9;

  --color-background: #191919;
  --color-foreground: #e3e2de;
  --color-popover: #242424;
  --color-popover-foreground: #e3e2de;
  --color-primary: #e3e2de;
  --color-primary-foreground: #191919;
  --color-muted: #242424;
  --color-muted-foreground: #9b9a97;
  --color-border: rgba(255, 255, 255, 0.08);
  --color-input: rgba(255, 255, 255, 0.12);
  --color-ring: #529cca;
  --color-secondary: #242424;
  --color-secondary-foreground: #e3e2de;
  --color-accent: #242424;
  --color-accent-foreground: #e3e2de;
  --color-destructive: #eb5757;
  --color-destructive-foreground: #ffffff;
}
```

(uniwind가 CSS 변수 재정의를 통해 다크 변형을 처리하는 정확한 메커니즘 — `.dark` 클래스 vs 변수 오버라이드 — 는 uniwind 문서/`useCSSVariable` 동작으로 검증 필요. `.dark` 클래스 접근이 안 되면 uniwind가 제공하는 테마 등록 방식(`UniwindConfig themes` + `Uniwind.setTheme`)으로 전환.)

**Step 2: theme 스토어 TDD**

```ts
// theme.store.ts
import { create } from 'zustand';
import { Uniwind } from 'uniwind';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

// 영속은 storage 추상화(apps/mobile/src/lib/storage) 주입으로 — 초기 부팅 시 hydrate
export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  setPreference: (preference) => {
    Uniwind.setTheme(preference); // 'system'도 지원 (config.common.d.ts: SYSTEM_THEME)
    set({ preference });
  },
}));
```

테스트: preference 변경 시 `Uniwind.setTheme` 호출 검증 (uniwind mock).

**Step 3: useColorScheme.ts 실구현**

```ts
import { useUniwind } from 'uniwind';
import { useThemeStore } from '@/src/stores/settings/theme.store';

export function useColorScheme() {
  const { theme } = useUniwind();
  const { preference, setPreference } = useThemeStore();
  return {
    colorScheme: theme === 'dark' ? 'dark' : 'light',
    isDarkColorScheme: theme === 'dark',
    themePreference: preference,
    setColorScheme: setPreference,
    toggleColorScheme: () => setPreference(theme === 'dark' ? 'light' : 'dark'),
  };
}
```

**Step 4: 설정 UI (데스크톱 ThemeSection 선례 — 시스템/라이트/다크 3버튼 세그먼트)**

`apps/mobile/src/components/settings/ThemeSection.tsx` — 데스크톱 `ThemeSection.tsx`의 옵션 구조(Monitor/Sun/Moon + active 스타일)를 RN Pressable 세그먼트로 이식. settings.tsx에 `<ThemeSection />` 마운트 (LanguageSection 위).

**Step 5: 네이티브 연동 확인**

- 부팅 직후 플래시 방지: `src/lib/init.ts`에서 스토어 hydrate 후 `Uniwind.setTheme(saved)` 동기 호출
- 상태바: `expo-system-ui`/`expo-navigation-bar` 사용처 확인 — `SystemBackgroundColor` 또는 루트 View가 `bg-app-bg`라 토큰 따르면 추가 작업 불필요. `_layout.tsx` 루트 컨테이너 클래스 확인.
- 웹(`_layout.web.tsx`)은 데스크톱과 별도 — 웹은 이번 스코프에서 모바일 네이티브만 다크 지원, 웹 변형은 `Appearance` 미지원으로 시스템 연동 없음 명시(스토어 기본 system).

**Step 6: 게이트 + 스크린샷 검증**

Run: `bun run lint && bun test`
`bun run ios` — 설정에서 다크 전환 → 주요 화면(보관함·채팅·설정·캡처) 라이트/다크 스크린샷 대비.

**Step 7: Commit**

```bash
git add -A && git commit -m "feat(mobile): 다크 모드 완전 구현 — .dark 토큰·시스템/라이트/다크 전환·설정 UI"
```

---

### Task 11: text-white·토큰 이탈 수리

**Files (bg-app-text 위 text-white — 다크에서 bg-app-text가 밝아지므로 대비 붕괴):**
- 방침: `bg-app-text` 배경 위 전경은 `text-app-bg`(토큰 역전)로 치환 — 라이트: 흰 배경 검정 글자 유지(white≈bg), 다크: 어두운 배경(`#242424`는 아님 — bg-app-text=밝은 `#e3e2de` 위 `#191919` 글자)으로 자동 대비 확보. uniwind가 CSS 변수라 `text-app-bg`는 테마 따라감.
- 대상 18파일: `chat.tsx:72-73,129-130`, `library/[id].tsx:176-177`, `RecommendationCard.tsx:136-137`, `CaptureSaveButton.tsx:17`, `Toast.tsx:85,88` (+`border-white/10`→`border-app-bg/10`), `LibraryFilterBar.tsx:135`, `AITargetPicker.tsx:38,56`, `BYOKProviderPicker.tsx:37`, `ReviewReminderSection.tsx:161,182`, `ModelCatalogFilters.tsx:82`, `ModelDownloadCard.tsx:143`, `MessageEditModal.tsx:101`, `ConversationEditModal.tsx:114,141`, `ChatAISetupDialog.tsx:74,77`, `ModelCardBadges.tsx:35`, `AITargetSettingsSection.tsx`(grep 결과 포함), `ChatMessage.tsx:48-51,82` (`text-white/80`→`text-app-bg/80` 등)
- `bg-black/50` 스크림 5곳 (`MessageEditModal.tsx:66`, `ConversationEditModal.tsx:79`, `EditKnowledgeItemModal.tsx:87`, `UnifiedCaptureForm.tsx` 내, `ScreenshotForm`은 Task 7 삭제) → `bg-app-text/50`(스크림) 유지 검토 — 스크림은 관례상 black 허용이나 통일 차원에서 토큰화. 판단: **스크림은 `bg-black/50` 유지** (양 테마에서 스크림 관행, DESIGN.md에 스크림 규칙 없음) — 대신 `Toast.tsx` `bg-black/10`류 위 토큰만 수리.
- `packages/ui/src/primitives/tooltip.tsx:33` — `bg-white`→`bg-popover`
- `packages/ui/src/primitives/glimpse-logo.tsx` — 브랜드 마크 hex는 유지 (로고 자산)

**Step 1: 치환 일괄 적용 (위 방침) → 게이트 → 다크 스크린샷 재검증 → 커밋**

```bash
git add -A && git commit -m "fix(mobile): bg-app-text 위 text-white를 토큰 역전(text-app-bg)으로 치환 — 다크 대비 확보"
```

---

### Task 12: UI 패턴 통합 — EmptyState·아이콘·간격

**Files:**
- Create: `packages/ui/src/primitives/empty-state.tsx`
- Modify: `packages/ui/src/primitives/index.ts` (재노출)
- Modify: `apps/mobile/src/components/library/EmptyLibraryState.tsx` → 삭제 후 `EmptyState`로 교체 사용처 변경 (`(tabs)/library.tsx`)
- Modify: `(tabs)/chat.tsx:113-135` 인라인 → EmptyState + CTA (action prop)
- Modify: `(tabs)/review.tsx`, `(tabs)/digest.tsx` QueryStateScrollView 빈 상태 → EmptyState 렌더 지원 (QueryStateScrollView에 `emptyState?: ReactNode` prop 추가 또는 emptyTitle/emptyDescription 유지 + 아이콘 prop)
- Modify: `chat/[id].tsx:178-185` → EmptyState compact
- Modify: `library/[id].tsx:142-154` → EmptyState
- 아이콘 크기: 22px→20px (`settings.tsx:107`, `capture.tsx:109`, `chat/[id].tsx:117,128`, `local-models.tsx` 등 8곳)
- 카드 간격: 리스트 mb-2.5/mb-3/mb-4→mb-2, p-3.5→p-4 (`(tabs)/library.tsx`, `(tabs)/chat.tsx`, `(tabs)/review.tsx`, `(tabs)/digest.tsx`)

**EmptyState 시그니처:**

```tsx
type EmptyStateProps = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void; disabled?: boolean; pendingLabel?: string };
  compact?: boolean; // py-8 (채팅 상세 등 좁은 컨텍스트)
};
```

stateless 유지 (색상은 내부에서 useSemanticColor 사용 — 기존 EmptyLibraryState 패턴).

**Step 1: EmptyState TDD (렌더 테스트) → Step 2: 6개 화면 교체 → Step 3: 아이콘/간격 정규화 → 게이트(`bun run lint && bun test && bun run ios`) → 커밋**

```bash
git add -A && git commit -m "feat(ui): 공유 EmptyState 프리미티브 신설·6화면 교체·아이콘·간격 정규화"
```

---

### Task 13: 데스크톱 색 토큰화

**Files:**
- Modify: `apps/desktop/src/components/graph/KnowledgeGraph.tsx:13-17` — NODE_COLORS를 CSS 변수로:
```ts
// 런타임 getComputedStyle로 --chart-1..5 읽기 or className 기반.
// SVG fill은 CSS 변수 직접 지원: fill="var(--chart-1)" 사용
const NODE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'] as const;
```
- Modify: `DesktopSyncSection.tsx:34,109`, `BYOKSection.tsx:183`, `ModelManagerSection.tsx:185,215`, `ModelCard.tsx:183-184` — green → 신설 `success` 토큰:
  - `apps/desktop/src/styles/globals.css` light/dark에 `--color-success: #1a7f37;` / dark `#7ee787` 추가 (`@theme inline`에 `--color-success: var(--success);` + 루트 `--success` 정의)
  - `bg-green-500`→`bg-success`, `text-green-600`→`text-success`, `text-green-700 dark:text-green-400`→`text-success`
- Modify: `packages/ui/src/primitives/tooltip.tsx:33` — `bg-white`→`bg-popover` (Task 11에서 모바일 분과로 처리했으면 생략)

**Step 1~2: 적용 → `bun run desktop:dev` 스크린 체크 (그래프 라이트/다크, 설정 상태색) → 커밋**

```bash
git add -A && git commit -m "refactor(desktop): 그래프 팔레트·상태색을 토큰(--chart-*, success)으로 전환"
```

---

## Part D — 문서 동기화

### Task 14: 문서·CHANGELOG·FALLBACKS

**Files:**
- Modify: `packages/ui/src/theme/semantic-colors.ts:53-58` — FALLBACKS를 globals.css 실값으로:
  - tagMintText `#24663b`, tagPeachText `#8a5020`, tagSkyText `#255d88`, tagLavenderText `#584578`, tagRoseText `#9c3838`, tagNeutralText `#64625d`
- Modify: `DESIGN.md` — 태그색 표를 globals.css 실값으로, 카드 radius `rounded-md`→`rounded-xl` 명시(또는 Card를 8px로 되돌릴지 판단: **코드 유지·문서 갱신** — 앱 전체 일관), 빈 상태 py-24, 아이콘 크기 가이드(액션 20, 마이크로 14+), 다크 모드 "모바일 지원" 추가, `text-app-bg` 역전 토큰 패턴 문서화
- Modify: `README.md:205` — "26 commands"→생성 커맨드 실수치(구현 시 재계산), `README.md:102` lint 설명 수정
- Modify: `apps/mobile/docs/rustra-bridge-development.md:21` — 커맨드 수 갱신
- Modify: `docs/plans/2026-08-30-graph-capture-infra.md:560` 등 `sync:e2e` 참조 — "apps/mobile에서 `bun run sync:e2e`" 명시 (과거 플랜 문서는 수정하지 않고, 이후 문서 기준만: **README에 실행 위치 명시**로 대체 — 과거 플랜 문서는 역사 기록이므로 불변)
- Modify: `CHANGELOG.md` — Unreleased에 8/21 이후: 복습 리마인더, 라벨링 백필, 양방향 델타 동기화+사전 백업, 채팅 RAG+참조 칩, digest 최근 연결, iOS Shortcuts 캡처, 그래프 증분 분석, sync_discover 브리지(Android), 본 일관성 수리 전체

**Step 1: FALLBACKS 통일 (작은 커밋) → Step 2: 문서 일괄 → Step 3: 최종 게이트**

최종 게이트: `bun run lint && bun test && bun run ios && bun run android && bun run web` + 데스크톱 `bun run desktop:dev` 각 1회.

```bash
git add -A && git commit -m "docs: DESIGN.md·README·브릿지 문서·CHANGELOG를 실제 구현과 동기화"
```

---

## 실행 순서 요약

A(1→2→3→4) → B(5→6, 착수 전 rustra 확인) → C(7→8→9→10→11→12→13) → D(14)

의존성: Task 4가 먼저 구 체계를 쓰지 않게 되므로 Task 7(구 폼 삭제)은 4 이후. Task 11(토큰 치환)은 10(다크 토큰) 이후가 스크린샷 검증에 유리하나 순서 교환 가능. Task 5·6은 새 rustra 배포 대기 가능 — 대기 중 A·C·D 먼저 진행.
