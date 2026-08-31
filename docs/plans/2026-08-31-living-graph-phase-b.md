# Living Knowledge Graph Phase B 구현 계획

> **For Codex:** `superpowers:executing-plans`와 `superpowers:test-driven-development`를
> 사용해 아래 작업을 순서대로 실행한다. 각 동작 변경은 실패 테스트를 먼저 확인한다.

**Goal:** 역순 중복, 0-edge 무한 재분석, 플랫폼별 생성 드리프트를 제거하고 모바일과
데스크톱이 같은 증분 분석 계약으로 그래프를 자동 갱신하게 한다.

**Architecture:** `Recommendation`은 동기화되는 엣지 진실 소스로 유지한다. Rust SQLite에
로컬 파생 상태인 `graph_analysis` 워터마크를 추가하고 엣지+워터마크를 한 트랜잭션으로
커밋한다. `packages/features/src/graph`는 dirty 판정, 배치 계획, 정규 쌍, 태그 폴백을
플랫폼 독립 순수 함수로 제공한다. 데스크톱과 모바일 코디네이터는 각 AI 제공자만 주입하고
같은 계획/커밋 계약을 실행한다.

**Tech Stack:** Rust/rusqlite/rustra, TypeScript, Bun test, React Query, Expo AppState.

---

## Task 1: 정규 쌍 불변식과 레거시 마이그레이션 승자 규칙 수정

**Files**

- Modify: `apps/desktop/src/features/graph/edge-merge.test.ts`
- Modify: `apps/desktop/src/features/graph/edge-merge.ts`
- Modify: `packages/core-rust/src/storage/migrations/0002_unique_recommendation_pairs.sql`
- Modify: `packages/core-rust/src/storage/sqlite/mod.rs`

1. 역순 제안이 기존 정방향 엣지와 중복되지 않는 실패 테스트를 추가한다.
2. `pairKey` 양쪽 분기를 동일한 `\u0000` 구분자로 정규화하고 테스트를 통과시킨다.
3. v1 중복 데이터 마이그레이션 테스트를 `accepted > pending > ignored > dismissed`,
   동률이면 최신 `responded_at ?? created_at`, 다시 동률이면 안정적인 id 순으로 기대하도록
   바꿔 실패를 확인한다.
4. `0002`의 keep-id 선택을 위 우선순위의 window function으로 바꾸고 피드백 remap을
   유지한다.
5. `bun test apps/desktop/src/features/graph/edge-merge.test.ts`와
   `cargo test -p glimpse-core storage::sqlite`를 실행한다.

## Task 2: 명시적 분석 워터마크와 원자적 커밋 저장소

**Files**

- Create: `packages/core-rust/src/storage/migrations/0005_graph_analysis.sql`
- Create: `packages/core-rust/src/storage/sqlite/graph_analysis.rs`
- Modify: `packages/core-rust/src/storage/sqlite/mod.rs`
- Modify: `packages/core-rust/src/storage/sqlite/knowledge.rs`
- Modify: `packages/core-rust/src/storage/sqlite/sync.rs`
- Modify: `packages/core-rust/src/models.rs`
- Modify: `packages/core-rust/src/core_client/mod.rs`
- Modify: `packages/core-rust/src/core_client/recommendation.rs`
- Modify: `packages/core-rust/src/application/recommendation.rs`

1. Rust 테스트로 다음 실패 계약을 먼저 만든다.
   - edge 0개인 `completed` 레코드도 저장·조회된다.
   - 역순/동시 재커밋은 실제 저장 엣지 1개만 남기고 저장 개수를 정확히 반환한다.
   - 존재하지 않는 노드의 엣지는 트랜잭션 전체를 실패시키며 워터마크도 남지 않는다.
   - 항목 삭제와 knowledge tombstone 병합은 관련 feedback→edge→watermark를 멱등 정리한다.
2. schema v5에 `graph_analysis(item_id PK, item_updated_at, analyzer_version,
   analyzed_at, edge_count, status, failure_count)`를 추가한다. `item_id`는
   `knowledge_items(id) ON DELETE CASCADE`, status/음수 필드에는 CHECK를 둔다.
3. `GraphAnalysisStatus`, `GraphAnalysisRecord`, `GraphAnalysisCommitResult` 모델을 추가한다.
4. `commit_graph_analysis(records, recommendations)`를 `BEGIN IMMEDIATE` 트랜잭션으로
   구현한다. 엣지 양 끝 존재를 재확인하고 정규 쌍 `ON CONFLICT DO NOTHING`의 실제 insert
   수를 반환한 뒤 워터마크를 upsert한다. 중간 실패는 rollback한다.
5. delete 및 full/delta sync 뒤 orphan graph data를 정리한다. 분석 워터마크는 export나
   sync payload에 포함하지 않는다.
6. `cargo test -p glimpse-core`와 `cargo clippy -p glimpse-core --all-targets -- -D warnings`를
   실행한다.

## Task 3: 공유 브리지와 CoreClient 계약 노출

**Files**

- Modify: `packages/bridge-rust/src/io/recommendation_feedback.rs`
- Modify: `packages/bridge-rust/src/recommendation.rs`
- Modify: `packages/bridge-rust/tests/commands_test.rs`
- Regenerate: `packages/bridge-rust/generated/{commands.ts,contract.ts,schema.json,types.ts}`
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/core-client/create-rustra-core-client.ts`
- Modify: `apps/mobile/src/features/core/types.ts`
- Modify: `apps/mobile/src/features/core/mobile-core-client.ts`
- Modify: `apps/mobile/src/features/core/native-core-fallback-client.ts`
- Modify: `apps/mobile/src/features/core/native-core-in-memory-storage.ts`

1. 브리지 계약 테스트에 `listGraphAnalysisRecords`와 `commitGraphAnalysis`의 0-edge,
   실제 저장 수, camelCase 왕복을 추가해 실패를 확인한다.
2. 두 `#[command]`와 IO 변환을 구현하고 `recommendation::register_commands`에 등록한다.
3. `GraphAnalysisRecord`, `GraphAnalysisCommitInput/Result`와 CoreClient 메서드를 shared에
   추가한다. shared rustra 어댑터가 생성 명령을 호출하도록 연결한다.
4. 모바일 facade와 in-memory fallback도 같은 계약을 구현해 웹/네이티브 fallback에서
   의미가 달라지지 않게 한다.
5. `bun run bridge:generate` 후 생성물 drift 검사와 bridge/shared/mobile 테스트 및
   typecheck를 실행한다.

## Task 4: 플랫폼 독립 Living Graph 순수 엔진

**Files**

- Create: `packages/features/src/graph/types.ts`
- Create: `packages/features/src/graph/pair.ts`
- Create: `packages/features/src/graph/plan.ts`
- Create: `packages/features/src/graph/fallback.ts`
- Create: `packages/features/src/graph/index.ts`
- Create: `packages/features/src/graph/*.test.ts`
- Modify: `packages/features/src/index.ts`

1. 실패 테스트로 0-edge completed, item `updatedAt` 변경, analyzer version 변경, failed
   backoff, 최신 우선 8개 배치, accepted/ignored/dismissed 쌍 재제안 차단, 결정론적 태그
   폴백을 고정한다.
2. `LIVING_GRAPH_ANALYZER_VERSION`, `normalizeGraphPair`, `classifyGraphAnalysis`,
   `planLivingGraphCycle`, `proposeGraphEdgesByTagOverlap`, `buildGraphAnalysisRecords`를
   순수 함수로 구현한다.
3. 출력 정렬과 tie-break를 명시해 모바일/데스크톱 동일 입력이 byte-equivalent 계획을
   만든다는 테스트를 추가한다.
4. `bun test packages/features/src/graph`와 packages typecheck를 실행한다.

## Task 5: 데스크톱 코디네이터를 공유 엔진으로 전환

**Files**

- Modify: `apps/desktop/src/features/graph/generate-knowledge-graph.ts`
- Modify: `apps/desktop/src/features/graph/generate-knowledge-graph.test.ts`
- Modify: `apps/desktop/src/hooks/useKnowledgeGraphAutomation.ts`
- Delete: `apps/desktop/src/features/graph/analysis-state.ts`
- Delete: `apps/desktop/src/features/graph/incremental-graph.ts`
- Delete or redirect their superseded tests

1. CoreClient fake를 사용해 0-edge 완료, AI 예외→태그 폴백, 원자 커밋, 재실행 skip,
   잔여 backlog drain을 실패 테스트로 만든다.
2. 데스크톱 제공자 호출만 로컬에 남기고 계획·폴백·레코드 작성은 shared graph 엔진을
   사용한다. AI 파싱 실패/미지원은 completed tag-fallback이지 failed가 아니다.
3. localStorage edge-derived digest를 제거하고 DB 워터마크+실패 횟수로 재시도/백오프를
   판단한다. 한 사이클이 0 edge여도 backlog가 줄면 이어서 drain한다.
4. recommendations와 graph-analysis query를 무효화하고 desktop graph 테스트, lint,
   typecheck를 실행한다.

## Task 6: 모바일 포그라운드 코디네이터를 공유 엔진으로 전환

**Files**

- Modify: `apps/mobile/src/hooks/useAppForegroundRecommendations.ts`
- Create or modify: `apps/mobile/src/hooks/useAppForegroundRecommendations.test.ts`
- Modify: `apps/mobile/src/features/recommendation/refreshRecommendations.ts`
- Modify: `apps/mobile/src/features/recommendation/refreshRecommendations.test.ts`
- Reuse: `apps/mobile/src/features/recommendation/proposeEdgesWithAI.ts`

1. 저장/수정으로 items query가 바뀌면 cadence와 무관하게 dirty 소량 배치가 예약되고,
   동시에 들어온 신호는 하나로 합쳐지며, unmount 시 취소되는 실패 테스트를 작성한다.
2. 모바일 AI 제안자를 주입하되 공유 계획/태그 폴백/원자 커밋을 실행한다. 배치는 4개로
   제한하고 AppState active 또는 items 변경 후 idle에만 수행한다.
3. 연결을 만들지 못한 항목도 completed watermark를 저장하고 recommendations 및 graph
   analysis 캐시를 무효화한다.
4. 모바일 graph/recommendation/hook 테스트, lint, typecheck를 실행한다.

## Task 7: 네이티브 산출물과 통합 시나리오 검증

**Files**

- Regenerate tracked artifacts under `apps/mobile/ios/Frameworks/` and Android bridge paths
- Modify: `apps/mobile/scripts/sync-headless-e2e.ts` only if a new assertion is needed
- Create: `thoughts/shared/research/2026-08-31_living-graph-phase-b-verification.md`

1. `bun run --cwd apps/mobile build:bridge:ios`와 `build:bridge:android`를 실행해 새 command
   symbol을 네이티브 산출물에 반영한다.
2. 캡처/수정→dirty→edge 또는 zero-edge watermark, 반복 실행 idempotence, 삭제,
   full/delta sync orphan cleanup 시나리오를 자동 테스트로 실행한다.
3. `bun run lint`, 모바일·데스크톱 typecheck, `bun test`, `cargo test --workspace`,
   `cargo clippy --workspace --all-targets -- -D warnings`, `apps/mobile bun run sync:e2e`를
   실행한다.
4. 실행 시각, 명령, pass/fail 수, 명시적 수동 잔여를 검증 문서에 기록하고 Phase B를
   완료 표기한다. 계정/실기기 검증은 완료로 추정하지 않는다.
