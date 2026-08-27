# 대형 후속 과제(선별) 구현 계획

## 개요

SPEC(`thoughts/shared/specs/2026-08-27_large-next-steps.md`)을 세 갈래로 구현한다: ① 데스크톱 임베딩 배치 API(Rust), ② useSemanticRerank 훅 승격+데스크톱 배치 연결, ③ 모바일 semantic 검색(BYOK-first)+CI 파이프라인 정비. 근거 리서치: `thoughts/shared/research/2026-08-27_13-07-25_large-next-steps.md`.

## 현재 상태 분석

- `engine.rs:248` 실제 구현·`:363` 스텁(variant별) — `embedding()`이 호출마다 새 컨텍스트 생성
- `run_embedding` 명령: commands.rs:117(async+spawn_blocking 선례), state.rs:411, runtime_service.rs:42
- `useSemanticRerank.ts`는 앱 전용 위치(apps/desktop/src/features/search/), 유일 소비처 `library/index.tsx`
- CI: 8/21 이후 rust 잡은 브릿지 stale 테스트(calculateNextReview 삭제 미반영 31→30)+unused import로 레드. iOS 잡은 도입일부터 expo-modules-core×Xcode 16.4 호환성으로 한 번도 그린 아님(러너 항상 Xcode_16.4, 로컬 Xcode 26.2 빌드 성공)
- 이미 로컬 완료: 브릿지 테스트 수리(commands_test.rs 31→30+calculateNextReview 블록 제거), tailscale.rs Path import cfg 게이트

## 목표 상태

검색 재정렬 임베딩이 한 번의 IPC로 처리되고, 같은 재정렬 로직이 모바일(BYOK 옵트인)에서 재사용되며, CI main push에서 js/rust가 그린.

### 주요 발견사항

- LlamaContext는 !Send — 상시 컨텍스트 불가, 배치는 하나의 함수 호출 안에서 컨텍스트 1회 생성+clear_kv_cache 루프
- 모바일 프로토콜 버전 검증은 `!==`(정확히 일치) — 이번 라운드 와이어 변경 없음, 무관
- Android/iOS 네이티브 빌드 산출물 경로·스텝 검증됨(8/27 실행 성공: Android green)

## 범위 제한

SPEC과 동일 — 델타 동기화/상시 컨텍스트/디스크 캐시/온디바이스 임베딩/wdio E2E/Playwright 스모크/거절 페널티 시간 창 제외. iOS 수리는 워크플로 내 최신 Xcode 선택(best-effort) 수준, 실패해도 cron 격리로 차단 없음.

## 구현 접근 방식

파일 집합이 서로소인 3개 sub-agent 병렬 + CI는 메인 에이전트 직접. 통합 후 전체 게이트 → 스코프별 커밋.

**임베딩 배치 계약(에이전트 간 고정)**:
- invoke명 `run_embedding_batch`, 페이로드 `{ requests: Array<{runtimeId, modelId, input}> }`
- 응답: `Array<{ vector: number[] }>`(단건 계약의 배열 확장, 순서 보존)
- 빈 배열은 TS에서 사전 가드(invoke 없이 [] 반환); 어떤 입력 실패든 전체 Err — TS는 기존처럼 warn-once 후 키워드 순서 폴백
- Rust: `embeddings_batch(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>, String>` — 컨텍스트 1회 생성, 텍스트마다 tokenize→decode→embeddings_seq_ith→ctx.clear_kv_cache(). 스텁 변형도 동일 시그니처(결정론적 벡터)
- bridge regen 불필요(tauri command, rustra #[command] 아님)

## Phase 1: Rust 임베딩 배치(Agent A — src-tauri만)

- `llm/engine.rs`: 양쪽 변형에 `embeddings_batch` 추가(TDD: 스텁 변형 테스트 먼저 — 다건 순서 보존/빈 입력 Err or []? → 빈 입력은 `[]` 반환으로 확정)
- `state.rs` `run_embedding_batch(inputs: &[String])`, `services/runtime_service.rs` `run_embedding_batch_blocking`(클로저 반환 패턴 유지), `commands.rs` async `run_embedding_batch`+spawn_blocking, `main.rs` 등록
- cargo test + clippy -D warnings 통과

## Phase 2: 훅 승격+데스크톱 배치 연결(Agent B — desktop TS+packages/hooks)

- `packages/hooks/src/search/useSemanticRerank.ts` 신설: deps 주입형 `{ embedBatch(input: string[]): Promise<{vector:number[]}>[] | number[][] , ... }` — 캐시(modelId 포함)/debounce 250ms/MAX_EMBED_ITEMS 30/warn-once 로직 이식, 기존 테스트 이동+배치 전환 테스트 추가(임베딩 호출 N항목→1회 단언)
- `desktop-llm-service.ts`: `runEmbeddingBatch(requests)` 메서드+payload builder/parser+계약 테스트(단건 파서 재사용 배열판)
- 기존 `apps/desktop/src/features/search/useSemanticRerank.ts` 삭제, `library/index.tsx` 소비처 이전(동작 동일)
- bun test+lint+typecheck 통과

## Phase 3: 모바일 semantic BYOK(Agent C — apps/mobile만)

- openai-compatible `/embeddings` 클라이언트(배치 input 배열, provider 능력 분기: anthropic이면 미지원), 옵트인 플래그(settings storage, 기본 OFF)+프라이버시 문구("선택 항목 내용이 선택한 API로 전송"), Phase 2 훅 소비로 검색 결과 재정렬 연결
- 단위 테스트: 능력 판정/배치 요청 바디·파싱/폴백(mock fetch)
- DESIGN.md 토큰 준수, bun test/lint/typecheck 통과

## Phase 4: CI 정비(메인 에이전트)

- `.github/workflows/ci.yml`: bun-version 3곳 1.4.0 통일 / rust 잡 말미에 `bunx tauri build --debug --no-bundle`(ubuntu, deps 인접 설치됨) / `audit-high`(schedule+workflow_dispatch 전용) 신설 / dorny/paths-filter v3 `changes` 잡 → android-release·ios-release를 `[schedule] 또는 [schedule, 관련 경로 변경]` 조건으로(주간 cron+path filter), iOS 잡엔 최신 Xcode 자동 선택 스텝(ls|sort -V|tail) 삽입
- YAML 유효성: actionlint 없으면 python yaml 파싱으로 검증

## 테스트 전략

- 단위: 배치 엔진(Rust), 서비스 계약(desktop), 훅 동등성+호출횟수, 모바일 클라이언트/플래그
- 크로스: `bun test` 전체, `cargo test --workspace`
- 수동(GUI, 커밋 메시지에 명시): 데스크톱 라이브러리 검색 재정렬 체감, 모바일 BYOK 옵트인 ON/OFF 스위칭, CI 실제 스케줄 동작

## 성능 고려사항

N개 항목 IPC 31회→1회, 임베딩당 컨텍스트 생성 N회→회당 배치 1회. spawn_blocking 유지로 메인 스레드 비점유.

## 참고 자료

- SPEC: `thoughts/shared/specs/2026-08-27_large-next-steps.md`
- 리서치: `thoughts/shared/research/2026-08-27_13-07-25_large-next-steps.md`
