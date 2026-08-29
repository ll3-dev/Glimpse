# 그래프 가치 실현 + 캡처 진입 + 인프라 고도화 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 그래프를 최신 24개 상한에서 전체 지식베이스 증분 분석으로 확장하고, 모바일에 연결 노트 뷰를 추가하며, ShareExtension 빌드를 수리하고, sync 발견 로직을 공유 Rust로 통합한다.

**Architecture:** 트랙 A(제품: A1 ShareExtension 수리 → A2 그래프 증분 파이프라인 → A3 모바일 연결 뷰)와 트랙 B(인프라: B0 rustra 잔존 정리 → B2 sync_discover/sync_plan Rust 통합)를 병행 진행. 모든 단계는 TDD로 진행하며 각 태스크가 테스트 게이트를 통과한 뒤 커밋한다.

**Tech Stack:** TypeScript(React/Expo + Tauri webview), Rust(core-rust/bridge-rust/tauri), Bun test, cargo test, React Query.

**설계 문서:** `docs/plans/2026-08-30-graph-capture-infra-design.md`

**사전 검증된 현황 (2026-08-30 조사):**
- B1(rustra 0.4.0)은 이미 완료됨 — Cargo `=0.4.0`, `@rustra/*` 0.4.0, JSI `onEvent`/`getContractHash` 배선 확인. 잔존: `packages/bridge-rust/package.json`의 `@rustra/types 0.1.3`만 남음.
- B2(`sync_discover`/`sync_plan`)는 미구현 — `packages/bridge-rust/src`에 관련 심볼 없음. discovery는 여전히 모바일 네이티브 모듈(`modules/sync-discovery`)+TS가 담당.
- ShareExtension 빌드 재현 성공: 실패 원인은 **Pods 모듈맵 부재**(`EXApplication.modulemap not found` 등 전 폐더) — glimpse 앱 타깃의 Swift 컴파일이 Pods 산출물 없이 선행되는 순서 문제. 워크스페이스(`glimpse.xcworkspace`) 빌드 또는 pod install 재생성이 1차 후보.

**공통 게이트 (모든 태스크 종료 시):**
```bash
cd /Users/loopy/dev/ll3/Glimpse && bun run lint && bun test && cd apps/desktop && bun run typecheck
```
Rust 변경 태스크에는 추가로:
```bash
cargo test --workspace && cargo clippy --workspace -- -D warnings
```

---

## Phase 0 — A1: ShareExtension 빌드 수리

### Task A1-1: Pods 모듈맵 부재 원인 특정·수리

**Files:**
- 검사: `apps/mobile/ios/Podfile.lock`, `apps/mobile/ios/Pods/` (빌드 산물)
- 결과물: DerivedData 산출물 (커밋 대상 아님)

**Step 1: 워크스페이스로 전체 빌드 시도 (팟 먼저 빌드되는 순서 확인)**

```bash
xcodebuild -workspace /Users/loopy/dev/ll3/Glimpse/apps/mobile/ios/glimpse.xcworkspace \
  -scheme glimpse -configuration Debug \
  -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
```

Expected: BUILD SUCCEEDED 또는 다른 실제 에러 노출. 워크스페이스 빌드는 팟을 먼저 빌드하므로 모듈맵 에러가 사라지는 게 정상.

**Step 2: 시뮬레이터 부팅·설치·실행**

```bash
xcrun simctl boot "iPhone 15" 2>/dev/null; open -a Simulator
xcrun simctl install booted <app-path-from-build-output>
xcrun simctl launch booted host.exp.Exponent 2>/dev/null || xcrun simctl launch booted <bundle-id>
```

Expected: 앱 정상 기동, 크래시 없음.

**Step 3: ShareExtension 스킴单独 빌드 확인**

```bash
xcodebuild -workspace /Users/loopy/dev/ll3/Glimpse/apps/mobile/ios/glimpse.xcworkspace \
  -scheme ShareExtension -configuration Debug \
  -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -3
```

Expected: BUILD SUCCEEDED.

**Step 4: 커밋**

코드 변경이 없으면 커밋 생략 (빌드 절차 문제). Podfile/pbxproj 변경이 발생하면:

```bash
git add apps/mobile/ios && git commit -m "fix(ios): ShareExtension 빌드 수리 — <실제 원인>"
```

### Task A1-2: 공유 시트 저장 플로우 수동 E2E

**Step 1:** 시뮬레이터에서 사파리 → 페이지 공유 → Glimpse ShareExtension → 저장.

**Step 2:** 앱 기동 → 캡처 대기열/아이템 생성 확인.

**Step 3:** 결과를 세션에 보고 (스크린샷 또는 관찰 기록).

Expected: 공유 → 저장 → 라이브러리에 아이템 표시.

---

## Phase 1-A — A2: 그래프 증분 파이프라인

### Task A2-1: 분석 상태 모델 + 테스트 (TDD)

**Files:**
- Create: `apps/desktop/src/features/graph/analysis-state.ts`
- Test: `apps/desktop/src/features/graph/analysis-state.test.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
import { describe, expect, it } from 'bun:test';
import { classifyItem, EDGE_STALE_AFTER_MS } from './analysis-state';
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

const baseItem = (overrides: Partial<KnowledgeItem>): KnowledgeItem =>
  ({ id: 'x', title: 't', body: null, summary: null, tags: [], createdAt: 0, updatedAt: 0, deletedAt: null, ...overrides }) as KnowledgeItem;

describe('classifyItem', () => {
  const edge = (itemA: string, itemB: string, createdAt: number): Recommendation =>
    ({ id: `${itemA}-${itemB}`, itemA_id: itemA, itemB_id: itemB, reason: null, status: 'pending', createdAt, respondedAt: null }) as Recommendation;

  it('엣지가 없으면 unanalyzed', () => {
    expect(classifyItem(baseItem({ id: 'a' }), [])).toBe('unanalyzed');
  });

  it('엣지가 있고 updatedAt <= 최근분석시각이면 analyzed', () => {
    // 최근분석시각 = 해당 아이템이 참여한 엣지 중 최신 createdAt
    expect(classifyItem(baseItem({ id: 'a', updatedAt: 100 }), [edge('a', 'b', 200)])).toBe('analyzed');
  });

  it('엣지 이후 수정되면 stale', () => {
    expect(classifyItem(baseItem({ id: 'a', updatedAt: 300 }), [edge('a', 'b', 200)])).toBe('stale');
  });
});
```

**Step 2: 실패 확인**

Run: `cd /Users/loopy/dev/ll3/Glimpse/apps/desktop && bun test src/features/graph/analysis-state.test.ts`
Expected: FAIL — `classifyItem is not defined` (모듈 부재)

**Step 3: 최소 구현**

`analysis-state.ts`:

```typescript
import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

export type ItemAnalysisState = 'unanalyzed' | 'analyzed' | 'stale';

/**
 * Per-item graph analysis state derived from existing edges.
 * An item's "analyzed watermark" is the newest edge createdAt among its
 * edges — no extra storage column needed (design: 2026-08-30).
 */
export function classifyItem(
  item: KnowledgeItem,
  itemEdges: Recommendation[],
): ItemAnalysisState {
  if (itemEdges.length === 0) return 'unanalyzed';
  const analyzedAt = Math.max(...itemEdges.map((edge) => edge.createdAt));
  return item.updatedAt > analyzedAt ? 'stale' : 'analyzed';
}

/** Group edges by item id — helper for batch classification. */
export function groupEdgesByItem(edges: Recommendation[]): Map<string, Recommendation[]> {
  const map = new Map<string, Recommendation[]>();
  for (const edge of edges) {
    for (const itemId of [edge.itemA_id, edge.itemB_id]) {
      const bucket = map.get(itemId);
      if (bucket) bucket.push(edge);
      else map.set(itemId, [edge]);
    }
  }
  return map;
}
```

**Step 4: 통과 확인**

Run: `bun test src/features/graph/analysis-state.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add apps/desktop/src/features/graph/analysis-state*.ts
git commit -m "feat(graph): 아이템 분석 상태 모델 — unanalyzed/analyzed/stale 분류"
```

### Task A2-2: 재검증 후보 산정 + 테스트 (TDD)

**Files:**
- Create: `apps/desktop/src/features/graph/recheck-candidates.ts`
- Test: `apps/desktop/src/features/graph/recheck-candidates.test.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
import { describe, expect, it } from 'bun:test';
import { selectRecheckCandidates } from './recheck-candidates';

const item = (id: string, tags: string[]): Parameters<typeof selectRecheckCandidates>[2][number] =>
  ({ id, tags, updatedAt: 1, deletedAt: null }) as never;

describe('selectRecheckCandidates', () => {
  const incoming = item('new', ['rust', 'sync']);
  const pool = [
    item('p1', ['rust', 'misc']),
    item('p2', ['rust', 'sync', 'extra']),
    item('p3', ['unrelated']),
  ];

  it('태그 유사도 상위 K개만 반환', () => {
    const result = selectRecheckCandidates(incoming, pool, 2);
    expect(result.map((c) => c.id).sort()).toEqual(['p1', 'p2']);
  });

  it('후보 풀은 analyzed 아이템만 (stale은 별도 경로)', () => {
    // p3는 태그 겹침 0 → 어떤 경우에도 선택되지 않음
    const result = selectRecheckCandidates(incoming, pool, 10);
    expect(result).toHaveLength(2);
  });

  it('자기 자신 제외', () => {
    const result = selectRecheckCandidates(incoming, [incoming], 10);
    expect(result).toHaveLength(0);
  });

  it('빈 풀 → 빈 배열', () => {
    expect(selectRecheckCandidates(incoming, [], 5)).toEqual([]);
  });
});
```

**Step 2: 실패 확인**

Run: `bun test src/features/graph/recheck-candidates.test.ts`
Expected: FAIL — 모듈 부재

**Step 3: 최소 구현**

`recheck-candidates.ts`:

```typescript
import type { KnowledgeItem } from '@glimpse/shared';

/** Shared-tag similarity: |A∩B| (Jaccard 불필요 — 정렬만 목적). */
function tagOverlap(left: KnowledgeItem, right: KnowledgeItem): number {
  const rightTags = new Set(right.tags ?? []);
  return (left.tags ?? []).filter((tag) => rightTags.has(tag)).length;
}

/**
 * Re-verification candidates for a newly analyzed item: analyzed items
 * ranked by shared-tag overlap, capped at K (design default 20).
 * O(n) per incoming item — tag set membership, no embeddings needed here;
 * embedding-based ranking can replace the scorer later without changing
 * the contract.
 */
export function selectRecheckCandidates(
  incoming: KnowledgeItem,
  analyzedPool: KnowledgeItem[],
  limit: number,
): KnowledgeItem[] {
  const self = incoming.id;
  return analyzedPool
    .filter((item) => item.id !== self)
    .map((item) => ({ item, overlap: tagOverlap(incoming, item) }))
    .filter(({ overlap }) => overlap > 0)
    .sort((left, right) => right.overlap - left.overlap)
    .slice(0, limit)
    .map(({ item }) => item);
}
```

**Step 4: 통과 확인**

Run: `bun test src/features/graph/recheck-candidates.test.ts`
Expected: PASS

**Step 5: 커밋**

```bash
git add apps/desktop/src/features/graph/recheck-candidates*.ts
git commit -m "feat(graph): 재검증 후보 산정 — 태그 유사도 상위 K"
```

### Task A2-3: 증분 생성기로 전환

**Files:**
- Modify: `apps/desktop/src/features/graph/generate-knowledge-graph.ts` (전체 재작성, 132줄 → 분할)
- Modify: `apps/desktop/src/features/graph/graph-source-window.ts` (콜드스타트 상한으로 역할 재정의)
- Modify: `apps/desktop/src/features/graph/generate-knowledge-graph.test.ts` (증분 케이스 추가)
- Create: `apps/desktop/src/features/graph/incremental-graph.ts`

**Step 1: 증분 생성기 실패 테스트 추가**

`generate-knowledge-graph.test.ts`에 케이스 추가 (기존 mock coreClient 패턴 따름):

```typescript
describe('증분 사이클', () => {
  it('신규 아이템만 LLM 프롬프트에 포함', async () => {
    // analyzed 아이템 3 + 신규 1 세팅 → complete() 호출 인자 검증
  });

  it('기존 엣지 유지 + 새 엣지만 추가', async () => {
    // saveRecommendations가 기존 엣지를 다시 저장하지 않는지 확인
  });

  it('배치 상한 8개 — 백로그 시 최신 우선', async () => { /* ... */ });

  it('삭제된 아이템 엣지 정리', async () => { /* ... */ });
});
```

(각 케이스의 arrange/act/assert는 기존 테스트 파일의 `generate-knowledge-graph.test.ts` mock 스타일을 그대로 따를 것 — 실행 시점에 해당 파일을 읽고 패턴 일치.)

**Step 2: 실패 확인**

Run: `bun test src/features/graph/generate-knowledge-graph.test.ts`
Expected: 신규 케이스 FAIL (기존 케이스는 PASS 유지 — 회귀 없음이 관찰됨)

**Step 3: 구현 — 증분 파이프라인**

`incremental-graph.ts` (신규 — 사이클 오케스트레이션):

```typescript
import type { CoreClient, KnowledgeItem, Recommendation } from '@glimpse/shared';
import { classifyItem, groupEdgesByItem } from './analysis-state';
import { selectRecheckCandidates } from './recheck-candidates';

export const MAX_BATCH_PER_CYCLE = 8;
export const RECHECK_LIMIT = 20;

export interface IncrementalCyclePlan {
  /** LLM 분석 대상: 신규(unanalyzed, 최신 우선) + stale, 배치 상한 적용 */
  toAnalyze: KnowledgeItem[];
  /** 재검증 페어 생성을 위한 analyzed 풀 */
  analyzedPool: KnowledgeItem[];
  /** 삭제된 아이템 — 엣지 정리 대상 */
  deleted: KnowledgeItem[];
}

export function planIncrementalCycle(
  allItems: KnowledgeItem[],
  existingEdges: Recommendation[],
  now: number = Date.now(),
): IncrementalCyclePlan {
  const edgesByItem = groupEdgesByItem(existingEdges);
  const live: KnowledgeItem[] = [];
  const deleted: KnowledgeItem[] = [];
  for (const item of allItems) {
    (item.deletedAt != null ? deleted : live).push(item);
  }
  const analyzed: KnowledgeItem[] = [];
  const backlog: KnowledgeItem[] = [];
  for (const item of live) {
    const state = classifyItem(item, edgesByItem.get(item.id) ?? []);
    if (state === 'analyzed') analyzed.push(item);
    else backlog.push(item);
  }
  // 최신 우선 처리
  backlog.sort((left, right) => right.updatedAt - left.updatedAt);
  return {
    toAnalyze: backlog.slice(0, MAX_BATCH_PER_CYCLE),
    analyzedPool: analyzed,
    deleted,
  };
}
```

`generate-knowledge-graph.ts` 재작성 방향:
1. `selectGraphSourceWindow` 호출 제거 → `planIncrementalCycle(coreClient가 로드한 전체 아이템, existing)` 사용
2. `proposeWithDesktopAI`는 `toAnalyze`와 각 아이템의 재검증 후보(`selectRecheckCandidates`)만 프롬프트에 포함 — **전체 풀을 프롬프트에 넣지 않음**
3. LLM 프롬프트 구조: `[{신규/변경 아이템, 후보들}]` 배열을 하나의 배치 프롬프트로
4. `proposeByTagOverlap` 폴백은 신규↔후보 페어만 계산
5. 엣지 병합: 기존 `existingPairs` 로직 유지(중복 방지), 삭제된 아이템이 포함된 proposed 엣지 스킵 + `MAX_NEW_EDGES` 유지
6. **콜드스타트:** `GRAPH_INPUT_ITEMS=24`는 `planIncrementalCycle` 첫 실행(엣지 0개) 시 초기 analyzed 풀 시딩용으로만 사용 — 첫 사이클에서 최신 24개를 우선 분석 후 이후 증분

**Step 4: 통과 확인 (전체 그래프 테스트 회귀 포함)**

Run: `bun test src/features/graph/`
Expected: PASS (기존 + 신규 전부)

**Step 5: 파일 복잡도 점검** (CLAUDE.md 기준 — 200줄 넘으면 분할. `generate-knowledge-graph.ts`가 재작성 후 200줄을 넘으면 `edge-merge.ts`로 병합 로직 추출)

**Step 6: 커밋**

```bash
git add apps/desktop/src/features/graph/ apps/desktop/src/hooks/useKnowledgeGraphAutomation.ts
git commit -m "feat(graph): 전체 지식베이스 증분 분석 파이프라인 — 24개 윈도우 상한 제거"
```

### Task A2-4: 자동화 훅 연동 + 게이트

**Files:**
- Modify: `apps/desktop/src/hooks/useKnowledgeGraphAutomation.ts` (digest 로직이 증분과 일치하는지 확인·조정)

**Step 1:** `computeGraphSourceDigest`가 이제 "전체 백로그 상태"를 반영하도록 조정 — 백로그가 비었으면 재실행 안 함. (변경 최소화: digest에 `toAnalyze.length` 포함)

**Step 2:** 공통 게이트 실행 — `bun run lint && bun test && bun run desktop:typecheck`

**Step 3:** 커밋

```bash
git add apps/desktop/src/hooks/useKnowledgeGraphAutomation.ts apps/desktop/src/features/graph/
git commit -m "feat(graph): 자동화 훅 증분 백로그 digest 연동"
```

### Task A2-5: 데스크톱 그래프 뷰 보강

**Files:**
- Modify: `apps/desktop/src/components/graph/KnowledgeGraph.tsx` (110줄 — 노드 클릭 핸들러 추가)
- Modify: `apps/desktop/src/app/_authenticated/graph.tsx`

**Step 1:** 노드 클릭 → 연결 엣지 하이라이트 + 근거 툴팁 (기존 SVG 구조 위에 onSelect 상태 추가).

**Step 2:** `bun run desktop:typecheck && bun run desktop:lint`

**Step 3:** `bun run desktop:tauri:dev`에서 그래프 페이지 수동 확인.

**Step 4:** 커밋

```bash
git add apps/desktop/src/components/graph/ apps/desktop/src/app/_authenticated/graph.tsx
git commit -m "feat(graph): 노드 선택 시 연결·근거 하이라이트"
```

---

## Phase 1-B — B0: rustra 잔존 정리

### Task B0-1: bridge-rust TS 패키지 @rustra/types 정렬

**Files:**
- Modify: `packages/bridge-rust/package.json:14` (`0.1.3` → `0.4.0`)

**Step 1:** 버전 갱신 후 `bun install` (lockfile 갱신).

**Step 2:** `generated/commands.ts`가 `@rustra/types` 타입을 쓰는지 확인 — 타입 불일치 컴파일 에러가 나면 codegen 산출물을 `bun run bridge:generate`로 재생성.

**Step 3:** 게이트: `bun run lint && bun test && cargo test -p glimpse-bridge`

**Step 4:**

```bash
git add packages/bridge-rust bun.lock
git commit -m "chore(bridge): @rustra/types 0.1.3→0.4.0 lockstep 완료"
```

---

## Phase 2-A — A3: 모바일 연결 노트 뷰

### Task A3-1: 연결 노트 조회 유스케이스 + 테스트 (TDD)

**Files:**
- Create: `apps/mobile/src/features/recommendation/getConnectedNotes.ts`
- Test: `apps/mobile/src/features/recommendation/getConnectedNotes.test.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
import { describe, expect, it } from 'bun:test';
import { connectedNotesForItem } from './getConnectedNotes';
import type { Recommendation, KnowledgeItem } from '@glimpse/shared';

const edge = (a: string, b: string): Recommendation =>
  ({ id: `${a}-${b}`, itemA_id: a, itemB_id: b, reason: '테스트 근거', status: 'pending', createdAt: 1, respondedAt: null }) as Recommendation;
const item = (id: string, title: string): KnowledgeItem =>
  ({ id, title, deletedAt: null }) as KnowledgeItem;

describe('connectedNotesForItem', () => {
  const items = [item('a', 'A'), item('b', 'B'), item('c', 'C')];
  const edges = [edge('a', 'b'), edge('a', 'c')];

  it('a의 연결은 b와 c', () => {
    const result = connectedNotesForItem('a', edges, items);
    expect(result.map((note) => note.item.id).sort()).toEqual(['b', 'c']);
  });

  it('삭제된 연결 대상 제외', () => {
    const deleted = [item('d', 'D'), edge('a', 'd')];
    deleted[0].deletedAt = 5;
    const result = connectedNotesForItem('a', [...edges, ...deleted], items);
    expect(result).toHaveLength(2);
  });

  it('연결 없으면 빈 배열', () => {
    expect(connectedNotesForItem('zzz', edges, items)).toEqual([]);
  });
});
```

**Step 2:** 실패 확인 → **Step 3:** 구현 (반대편 itemA_id/itemB_id 교차 조회 + deletedAt 필터 + reason/tags 포함 반환) → **Step 4:** 통과 → **Step 5:** 커밋

```bash
git add apps/mobile/src/features/recommendation/getConnectedNotes*
git commit -m "feat(mobile): 연결 노트 조회 유스케이스"
```

### Task A3-2: 상세 화면 "연결된 노트" 섹션

**Files:**
- Create: `apps/mobile/src/components/library/ConnectedNotesSection.tsx`
- Modify: `apps/mobile/app/library/[id].tsx` (섹션 추가 — 화면은 이미 컴포넌트 추출 완료 상태)
- Modify: `apps/mobile/src/hooks/queries/useRecommendations.ts` (전체 목록 쿼리 또는 item별 필터 쿼리 추가)

**Step 1:** `ConnectedNotesSection` 컴포넌트 — DESIGN.md 시맨틱 토큰(`bg-app-surface`, `text-app-muted`, `border-app-border`) 사용, 공통 태그 배지 + reason 한 줄 표시, 노드 탭 시 `router.push('/library/<id>')`.

**Step 2:** `[id].tsx` 하단에 섹션 마운트 + 쿼리 연결. 모바일은 읽기 전용(응답 UI 없음).

**Step 3:** 게이트: `bun run lint && bun test` + `bun run ios` 시뮬레이터에서 라이브러리 상세 진입 확인.

**Step 4:**

```bash
git add apps/mobile/src/components/library/ConnectedNotesSection.tsx apps/mobile/app/library/\[id\].tsx apps/mobile/src/hooks/queries/useRecommendations.ts
git commit -m "feat(mobile): 아이템 상세 연결된 노트 섹션"
```

---

## Phase 2-B — B2: sync 로직 공유 Rust 통합

### Task B2-1: sync_discover desktop 백엔드 (mdns-sd) + 커맨드

**Files:**
- Create: `packages/bridge-rust/src/sync_discovery/mod.rs`
- Modify: `packages/bridge-rust/src/lib.rs` (`#[command] sync_discover` 등록)
- Modify: `apps/desktop/src-tauri/Cargo.toml` (mdns-sd 의존성 — 이미 서버가 쓰므로 확인만)
- Test: `packages/bridge-rust/src/sync_discovery/tests.rs` (trait mock)

**Step 1:** discovery 트레잇 + desktop 구현 + mock 테스트 작성 (TDD: mock 테스트 먼저).

```rust
// sync_discovery/mod.rs 핵심 구조
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredPeer {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub addresses: Vec<String>,
}

#[async_trait]
pub trait DiscoveryBackend: Send + Sync {
    async fn discover(&self, timeout_ms: u64) -> Result<Vec<DiscoveredPeer>, String>;
}

pub struct MdnsSdBackend { /* desktop */ }
```

**Step 2:** `bun run bridge:generate`로 TS 클라이언트 재생성.

**Step 3:** 게이트: `cargo test --workspace && cargo clippy --workspace -- -D warnings` + TS 게이트.

**Step 4:** 커밋 `feat(bridge): sync_discover 커맨드 — desktop mdns-sd 백엔드`

### Task B2-2: sync_plan 커맨드 — 판단 로직 Rust 이동

**Files:**
- Create: `packages/bridge-rust/src/sync_plan.rs`
- Modify: `packages/bridge-rust/src/lib.rs`
- Test: `packages/bridge-rust/src/sync_plan.rs` 내 `#[cfg(test)]`

**Step 1:** 엔드포인트 우선순위·백오프 계산을 현재 TS 구현(`apps/mobile/src/features/sync/sync-url.ts`, `backoff.ts`)의 계약 그대로 Rust로 이식 — **TS 테스트 케이스를 Rust 테스트로 1:1 이식해 계약 동일성 보장.**

**Step 2:** `bridge:generate` 재생성, TS 어댑터가 `sync_plan`을 호출하도록 얇게 교체 (기존 TS 단위 테스트는 어댑터 위임 검증으로 전환).

**Step 3:** 게이트 전체 + `bun run sync:e2e` (헤드리스 양방향 E2E — 회귀 확인).

**Step 4:** 커밋 `feat(bridge): sync_plan 커맨드 — 엔드포인트/백오프 판단 Rust 이동`

### Task B2-3: iOS dnssd 백엔드

**Files:**
- Create: `packages/bridge-rust/src/sync_discovery/dnssd.rs` (cfg(target_os="ios"))

**Step 1:** dnssd C API 바인딩(`DNSServiceBrowse`/`DNSServiceResolve`) — entitlement 불필요 경로. `#[cfg(target_os = "ios")]` 게이트.

**Step 2:** `cargo check`는 macOS에서 ios 타깃 확인: `cargo check -p glimpse-bridge --target aarch64-apple-ios` (사전 검증: rustup 타깃 추가 여부).

**Step 3:** 커밋 `feat(bridge): sync_discover iOS dnssd 백엔드`

### Task B2-4: Android JNI 백엔드 + 시뮬레이터 검증

**Files:**
- Create: `packages/bridge-rust/src/sync_discovery/jni.rs` (cfg(target_os="android"))

**Step 1:** Rust→JNI→NsdManager 직접 호출 (사용자 확정 사양).

**Step 2:** `cargo check -p glimpse-bridge --target aarch64-linux-android`.

**Step 3:** 데스크톱 서버 구동 + iOS 시뮬레이터에서 발견→페어링→동기화 재검증 (mDNS 설계의 검증 절차 문서 따름).

**Step 4:** 커밋 `feat(bridge): sync_discover Android JNI 백엔드`

---

## 세션 종료 전 GUI 체크리스트 (수동)

- [ ] ShareExtension: 사파리 공유 → 저장 → 라이브러리 표시
- [ ] 데스크톱 그래프: 증분 실행 후 엣지 생성·노드 클릭 하이라이트
- [ ] 모바일 상세: 연결된 노트 섹션 표시·탭 이동
- [ ] 시뮬레이터: LLM 스트리밍 정상 (B2 브리지 변경 회귀)

## 명시적 범위 외

- Android 실기기·BGTaskScheduler 실기기 검증
- EAS 자격증명 (배포 결심 시 별도 세션)
- 모바일 그래프 시각화, 웹 클립버드
