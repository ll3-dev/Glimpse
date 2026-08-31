# 설계: Living Graph Phase C 풀 패리티 마감

- 날짜: 2026-08-31
- 상태: 승인됨
- 상위 설계: `docs/plans/2026-08-31-living-knowledge-graph-design.md` (§7 발견·탐색 UX)
- 선행 상태: Phase B Task 1~6 커밋 완료, Task 7(검증) 미완료

## 1. 목표

Phase C의 발견·탐색 UX를 모바일과 데스크톱 양쪽에서 동등하게 동작하게 하고,
Phase B의 검증 마감까지 한 사이클로 완결한다.

현재 기준선:

- 모바일에는 작업 트리에 `GraphDiscoveryCard`, `GraphEdgeInspector`,
  `GraphCanvas` 변경이 있고 `selectTodayDiscoveries`, `layoutFocusedGraph`,
  `focusId` 라우팅까지 연결돼 있다. 미커밋 상태다.
- 데스크톱 `KnowledgeGraph`는 전체 타원 레이아웃만 제공한다. 포커스 레이아웃,
  발견 카드, 엣지 근거 패널, 라이브러리→그래프 진입이 전무하다.
- Phase B Task 7(네이티브 산출물 재생성, 통합 시나리오 검증 문서)이 남아 있다.

## 2. 선택한 접근

모바일先行 자산을 데스크톱으로 이식한다. 발견 선택·포커스 레이아웃·피드백 mutation은
이미 공유 계층에 검증돼 있으므로 데스크톱은 프레젠테이션만 새로 작성한다.

채택하지 않은 접근:

- 데스크톱 전용 재설계 — 같은 계약을 두 번 만들어 드리프트 위험 증가
- UX 확장 선행 — 패리티 없는 상태에서 확장하면 미완성이 두 플랫폼으로 복제됨

## 3. 단계와 순서

각 단계는 커밋 가능한 단위이고 이전 단계에 의존한다.

1. **모바일 Phase C 마무리** — 작업 트리의 발견 카드, 엣지 인스펙터, 캔버스 변경을
   게이트 통과 후 커밋한다.
2. **데스크톱 발견·엣지 인스펙터** — 발견 배너와 엣지 클릭 근거 패널을 추가한다.
3. **데스크톱 포커스 그래프 + 검색→그래프 진입** — `layoutFocusedGraph` 소비와
   `?focusId=` 라우팅, 라이브러리 상세 진입점을 추가한다.
4. **Phase B Task 7 마감** — 네이티브 산출물 재생성, 통합 시나리오 검증 문서,
   전체 게이트 실행 후 Phase B를 완료 표기한다.

## 4. 컴포넌트 구조

공유 계층은 변경하지 않는다. `selectTodayDiscoveries`,
`layoutFocusedGraph`, `useRespondToRecommendationMutation`을 소비만 한다.

### 4.1 모바일 (1단계, 이미 구현된 것 확정)

- `apps/mobile/src/components/graph/GraphDiscoveryCard.tsx` — 발견 카드
- `apps/mobile/src/components/graph/GraphEdgeInspector.tsx` — 엣지 근거·피드백
- `apps/mobile/src/components/graph/GraphCanvas.tsx` — 엣지 선택 지원
- `apps/mobile/app/(tabs)/graph.tsx` — 발견 1장 노출, 포커스 레이아웃 전환

### 4.2 데스크톱 (2~3단계)

- 신규 `apps/desktop/src/components/graph/GraphDiscoveryBanner.tsx` — 발견 카드.
  모바일 카드와 동일한 props 계약
  (`discovery, isResponding, onOpenItem, onFocus, onAccept, onIgnore, onDismiss`),
  데스크톱 카드 스타일(`border-border bg-card`). `src/ui`는 원자 계층이므로
  feature 결합 컴포넌트는 `components/graph`에 둔다.
- 수정 `KnowledgeGraph.tsx`
  - props에 `focusId?: string | null` 추가. 있으면 `layoutFocusedGraph`,
    없으면 `layoutGraph`.
  - 엣지 `<line>`에 `onClick` 추가. 선택된 엣지의 근거를 하단 패널로 표시한다.
    기존 `<title>` hover는 보조 수단으로 유지한다.
- 수정 `apps/desktop/src/app/_authenticated/graph.tsx`
  - TanStack Router `validateSearch`로 `?focusId=` 수신
  - `useRespondToRecommendationMutation` 연결
- 수정 `apps/desktop/src/app/_authenticated/library/$itemId.tsx`
  - "그래프에서 보기" 액션 → `/graph?focusId=$itemId`
  - 데스크톱 라이브러리가 인라인 검색이므로 상세 경유로 충분하다.
    별도 검색→그래프 경로는 만들지 않는다(YAGNI).

## 5. 데이터 흐름

```text
그래프 화면 진입 (?focusId=)
  -> items/recommendations 쿼리 (기존 queryKeys 재사용, 신규 쿼리 없음)
  -> focusId ? layoutFocusedGraph : layoutGraph
  -> 발견 카드 = selectTodayDiscoveries(items, recommendations, 1)[0]
  -> 수락/무시/삭제 = useRespondToRecommendationMutation
  -> onSuccess invalidate recommendations.all (기존 훅이 처리)
  -> 카드 소멸 또는 다음 후보로 자동 교체
```

오류 처리는 React Query 기본 롤백·에러 표기에 위임하고 신규 상태 코드를
만들지 않는다. 발견 카드는 pending이 없으면 최근 accepted를, 그것도 없으면
렌더하지 않는다. 이 분기는 `selectTodayDiscoveries`가 이미 처리한다.

## 6. 테스트 전략

- 단위/순수 계층 변경 없음 — 기존 `discovery.test.ts`,
  `graph-layout.test.ts` 통과 유지.
- 데스크톱 컴포넌트 테스트 신규(최소):
  - 포커스 전환 — `focusId` 있음 → 중앙 노드 = 포커스, 1홉 이웃 내부 링.
    없음 → 기존 타원 배치.
  - 발견 카드 — pending 없음 → 미렌더, 있음 → 수락 mutation 호출.
- 공통 게이트: `bun run lint`, `bun run desktop:typecheck`, `bun test`,
  모바일 `bun run typecheck`. Rust 변경 없음.

## 7. Phase B Task 7 마감 (4단계)

1. `bun run --cwd apps/mobile build:bridge:ios`와 `build:bridge:android` 실행 후
   재생산된 네이티브 산출물 커밋.
2. 시나리오 검증: 캡처/수정→dirty→edge 또는 0-edge 워터마크, 반복 실행 멱등성,
   삭제 정리, full/delta sync orphan cleanup. 기존 `sync-headless-e2e.ts`의
   어설션을 재사용하고 부족하면 최소 추가한다.
3. `bun run lint`, 모바일·데스크톱 typecheck, `bun test`, `cargo test --workspace`,
   `cargo clippy --workspace --all-targets -- -D warnings`, `apps/mobile bun run sync:e2e`
   실행.
4. `thoughts/shared/research/2026-08-31_living-graph-phase-b-verification.md`에
   실행 기록을 남기고 Phase B를 완료 표기한다.

## 8. 수동 게이트와 비범위

수동 잔여는 명시적으로 남긴다: GUI 시뮬레이터 확인(발견 카드 반응·다크 모드),
실기기 항목은 기존 수동 게이트 문서에 기록한다. 미완료 수동 게이트가 있으면
전체 프로그램 완료로 주장하지 않는다.

비범위:

- 발견 카드 다중 노출(1장 유지)
- 사이드 시트형 엣지 인스펙터
- 데스크톱 검색 전용 화면 신설
- 3D 그래프와 물리 애니메이션
