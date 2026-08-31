# Living Knowledge Graph Phase D 구현 계획

- 상태: 구현 및 검증 완료
- 완료 시각: 2026-08-31 17:56 KST
- 검증 기록: `thoughts/shared/research/2026-08-31_living-graph-phase-d-verification.md`
- 선행 단계: Phase C 구현 완료, 데스크톱 UI 수동 게이트 잔여 (`f9d0ad4`)

> **For Codex:** `superpowers:test-driven-development`로 집계와 시나리오의 실패 테스트를
> 먼저 만들고, 완료 주장은 서로 다른 입력 지문의 receipt와 현재 트리 전체 게이트로만 한다.

**Goal:** Living Graph가 얼마나 처리되고 연결되는지 원문이나 외부 텔레메트리 없이
로컬에서 설명하고, 증분 처리의 정확성과 비용을 반복 가능한 증거로 남긴다.

**Architecture:** `packages/features`에 상태 배열을 숫자 집계로만 변환하는 순수 품질
함수를 둔다. 모바일 MMKV와 데스크톱 localStorage에는 발견 상세 이동 및 실행 횟수,
처리 항목 수, 건너뛴 항목 수, 실행 시간의 제한된 합계·최근 표본만 저장한다. 개발자용
receipt는 합성 토폴로지만 사용하며 콜드 스타트·무변경·수정·삭제·동기화 스냅샷과
반복 실행 시간 분포를 JSON으로 기록한다.

**Privacy:** receipt와 로컬 집계에는 제목, 본문, URL, 태그, 요약, 프롬프트, API 키를
기록하지 않는다. 항목·연결 ID도 출력하지 않고 개수, 상태, 밀리초와 해시만 남긴다.

---

## Task 1: 공유 로컬 품질 집계

**Files**

- Create: `packages/features/src/graph/metrics.ts`
- Create: `packages/features/src/graph/metrics.test.ts`
- Modify: `packages/features/src/graph/index.ts`

1. 현재 항목·분석 버전과 일치하는 완료/실패, actionable backlog, backoff deferred,
   전체 재분석에서 건너뛴 항목을 테스트로 고정한다.
2. 존재하는 양 endpoint를 가진 연결만 상태별로 집계하고, 실제 그래프에 보이는
   pending/accepted 연결을 기준으로 연결·고립 항목 수를 계산한다.
3. 상태 비율은 연결 0개에서도 `NaN` 없이 0을 반환하고 모든 결과를 숫자 집계로 제한한다.

## Task 2: 플랫폼 로컬 실행·발견 카운터

**Files**

- Create: `apps/mobile/src/features/graph/graph-metrics.store.ts`
- Create: `apps/mobile/src/features/graph/graph-metrics.store.test.ts`
- Modify: `apps/mobile/src/lib/storage.shared.ts`
- Modify: `apps/mobile/src/features/recommendation/refreshRecommendations.ts`
- Modify: `apps/mobile/app/(tabs)/graph.tsx`
- Create: `apps/desktop/src/features/graph/graph-metrics.store.ts`
- Create: `apps/desktop/src/features/graph/graph-metrics.store.test.ts`
- Modify: `apps/desktop/src/features/graph/generate-knowledge-graph.ts`
- Modify: `apps/desktop/src/app/_authenticated/graph.tsx`

1. 저장 포맷을 버전 1로 두고 손상된 값은 빈 집계로 복구하며 최근 실행 시간 표본은
   고정된 최대 길이로 제한한다.
2. 그래프 실행마다 성공/실패, 처리·건너뜀 수, 지속 시간을 기록한다. 발견 카드에서
   상세로 이동할 때만 발견 상세 이동 횟수를 증가시킨다.
3. 저장 실패가 그래프 생성이나 탐색을 중단하지 않도록 플랫폼 저장소 경계를 fail-open으로
   유지한다.

## Task 3: 재현 가능한 증분 처리 receipt

**Files**

- Create: `scripts/living-graph-receipt.ts`
- Create: `scripts/living-graph-receipt.test.ts`
- Modify: `package.json`

1. `bun run graph:receipt -- --seed <seed> --output <path>` 명령을 제공한다.
2. 콜드 스타트, 무변경, 일부 수정, 항목 삭제, 동기화 유입을 같은 순수 계획·집계 함수로
   실행하고 기대 backlog/skip/orphan 제거를 assertion으로 검증한다.
3. 각 시나리오를 여러 번 실행해 min/p50/p95/max를 기록한다. `generatedAt`, 소스 기반
   build fingerprint, seed가 반영된 input fingerprint, Bun/플랫폼 정보를 포함한다.
4. 출력 JSON에 민감 필드명이나 합성 항목 ID 배열도 포함하지 않는 계약 테스트를 둔다.

## Task 4: Phase D 증거와 전체 게이트

**Files**

- Create: `thoughts/shared/research/receipts/living-graph-phase-d-a.json`
- Create: `thoughts/shared/research/receipts/living-graph-phase-d-b.json`
- Create: `thoughts/shared/research/2026-08-31_living-graph-phase-d-verification.md`
- Modify: `docs/plans/2026-08-31-living-knowledge-graph-design.md`
- Modify: `docs/plans/2026-08-31-living-graph-phase-d.md`

1. 서로 다른 seed와 `generatedAt`·input fingerprint를 가진 receipt 두 개를 만든다.
2. receipt 계약/시나리오 테스트, 관련 모바일·데스크톱 테스트, lint/typecheck, 전체 JS와
   Rust 게이트를 현재 트리에서 실행한다.
3. 명령, 시각, 파일 해시, 분포와 증명 범위를 검증 기록에 남긴다. 합성 microbenchmark를
   실제 AI·SQLite·기기 지연으로 확대 해석하지 않는다.
