# Living Knowledge Graph Phase C 구현 계획

- 상태: 구현 완료, 데스크톱 UI 수동 게이트 잔여
- 완료 시각: 2026-08-31 17:37 KST
- 검증 기록: `thoughts/shared/research/2026-08-31_living-graph-phase-c-verification.md`
- 선행 단계: Phase B 완료 (`cf723c6`)

> **For Codex:** `superpowers:test-driven-development`로 공유 렌즈의 실패 테스트를 먼저
> 확인하고, UI 변경 뒤 `react-doctor`와 플랫폼 런타임 스모크를 실행한다.

**Goal:** 모바일과 데스크톱에서 새 연결을 바로 판단하고, 검색·상세·그래프 사이를
오가며 선택한 지식의 1-hop 관계와 연결 근거를 탐색할 수 있게 한다.

**Architecture:** `packages/shared`는 결정론적 전체/포커스 좌표를, `packages/features`는
오늘의 발견 선정 규칙을 제공한다. 화면은 쿼리와 mutation 및 라우팅을 조정하고,
발견 카드·엣지 인스펙터 같은 feature-aware UI는 각 앱의 `components/graph`에 둔다.
기존 `Recommendation` 상태와 피드백 동기화 계약은 바꾸지 않는다.

**Design:** Notion-inspired warm minimalism을 유지하고 모든 색은 semantic token을 쓴다.
그래프 자체보다 발견 근거와 다음 행동을 먼저 읽을 수 있게 하되, 카드 중첩과 별도
복잡한 모드 토글은 추가하지 않는다.

---

## Task 1: 공유 오늘의 발견 선정과 포커스 레이아웃

**Files**

- Create: `packages/features/src/graph/discovery.ts`
- Create: `packages/features/src/graph/discovery.test.ts`
- Modify: `packages/features/src/graph/index.ts`
- Modify: `packages/shared/src/graph-layout.ts`
- Modify: `packages/shared/src/graph-layout.test.ts`

1. 유효한 endpoint만 노출, pending 우선, 근거가 있는 최신 연결 우선, pending이 없으면
   최근 accepted 폴백, 안정적인 tie-break를 실패 테스트로 고정한다.
2. `selectTodayDiscoveries(items, recommendations, limit)`를 순수 함수로 구현한다.
3. focus 노드는 중앙, 1-hop 이웃은 안쪽 링, 나머지 context는 바깥 링에 두며 focus와
   이웃이 36개 제한에서 우선 보존되는 실패 테스트를 추가한다.
4. `layoutFocusedGraph`를 구현하고 전체 레이아웃의 기존 계약을 유지한다.

## Task 2: 모바일 발견·포커스·엣지 탐색

**Files**

- Create: `apps/mobile/src/components/graph/GraphDiscoveryCard.tsx`
- Create: `apps/mobile/src/components/graph/GraphEdgeInspector.tsx`
- Modify: `apps/mobile/src/components/graph/GraphCanvas.tsx`
- Modify: `apps/mobile/src/components/graph/GraphCanvas.test.tsx`
- Modify: `apps/mobile/src/components/graph/index.ts`
- Modify: `apps/mobile/app/(tabs)/graph.tsx`

1. edge press가 별도 callback으로 전달되고 선택 상태가 시각·접근성 계약에 반영되는
   실패 테스트를 만든다.
2. `focusId` search param을 읽어 첫 렌더부터 포커스 레이아웃을 사용한다. 노드 탭은
   focus를 바꾸고 동일 노드 재탭은 전체 렌즈로 돌아간다.
3. `오늘의 발견` 카드에 두 제목, 근거, 상세 이동, pending 수락·무시·나중에 액션을
   제공한다. accepted 폴백은 읽기 전용 상태를 명시한다.
4. 엣지 탭은 근거와 양 endpoint 상세 이동을 보여준다.

## Task 3: 모바일 검색·상세에서 포커스 그래프로 진입

**Files**

- Modify: `apps/mobile/src/components/library/LibraryActiveFilterBar.tsx`
- Modify: `apps/mobile/app/(tabs)/library.tsx`
- Modify: `apps/mobile/src/components/library/ConnectedNotesSection.tsx`
- Modify: `apps/mobile/app/library/[id].tsx`

1. 검색 결과가 있을 때 첫 결과를 포커스하는 `그래프로 보기` 액션을 active-filter
   행에 제공한다.
2. 상세의 연결 섹션 헤더에 현재 항목 중심 그래프 진입을 추가한다. 연결이 없어도
   상세 CTA를 통해 현재 항목의 고립 상태를 그래프에서 확인할 수 있게 한다.
3. Expo Router params가 `focusId`를 보존하는 소스 계약 테스트를 추가한다.

## Task 4: 데스크톱 발견·포커스·엣지 탐색

**Files**

- Create: `apps/desktop/src/components/graph/GraphDiscoveryCard.tsx`
- Create: `apps/desktop/src/components/graph/GraphEdgeInspector.tsx`
- Modify: `apps/desktop/src/components/graph/KnowledgeGraph.tsx`
- Modify: `apps/desktop/src/app/_authenticated/graph.tsx`
- Add/Modify: 관련 component tests

1. route search의 `focus`를 검증하고 `KnowledgeGraph`의 제어 포커스 초기값으로 전달한다.
2. 발견 카드와 피드백 mutation을 모바일과 같은 상태 의미로 연결한다.
3. 노드 선택 시 중앙 포커스 좌표로 재배치하고, edge click 시 근거·endpoint 상세 이동을
   제공한다. 키보드로 노드와 액션을 사용할 수 있게 한다.

## Task 5: 데스크톱 검색·상세에서 포커스 그래프로 진입

**Files**

- Modify: `apps/desktop/src/app/_authenticated/library/index.tsx`
- Modify: `apps/desktop/src/app/_authenticated/library/$itemId.tsx`
- Modify: `apps/desktop/src/components/library/KnowledgeItemDetail.tsx`

1. 검색 결과가 있을 때 첫 결과를 중심으로 그래프를 여는 액션을 추가한다.
2. 상세 헤더에 현재 항목 중심 그래프 CTA를 추가한다.
3. TanStack Router search params가 focus ID를 보존하는 typecheck와 테스트를 실행한다.

## Task 6: Phase C 검증과 기록

**Files**

- Create: `thoughts/shared/research/2026-08-31_living-graph-phase-c-verification.md`
- Modify: `docs/plans/2026-08-31-living-knowledge-graph-design.md`
- Modify: `docs/plans/2026-08-31-living-graph-phase-c.md`

1. 공유/모바일/데스크톱 관련 테스트, lint, typecheck를 실행한다.
2. `react-doctor`로 두 React 앱의 변경을 점검한다.
3. 모바일 iOS Simulator에서 발견 카드·포커스·상세 이동과 다크 모드를, 데스크톱에서
   검색→포커스와 피드백 반영을 스모크 체크한다.
4. 현재 시각, 명령, 결과, 이미지 경로와 수동 잔여를 검증 기록에 남기고 Phase C를
   완료 표기한다.
