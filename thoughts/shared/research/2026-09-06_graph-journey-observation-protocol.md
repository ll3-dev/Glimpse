---
date: 2026-09-06
researcher: Claude (scoped implementation continuation)
git_commit: 093520a (baseline, uncommitted working tree)
branch: main
repository: Glimpse
topic: "그래프 로컬 여정 관찰 프로토콜(1주)과 검증 기록"
tags: [research, graph, evaluation, observation-protocol, privacy]
status: complete
last_updated: 2026-09-06
last_updated_by: Claude
---

# 그래프 여정 관찰 프로토콜 (2026-09-06)

**근거**: `docs/plans/2026-09-06-graph-evaluation.md`. 캡처 성공 → 발견 카드 열기 →
항목 재방문(revisit)의 **로컬 전용** 여정 관찰. 이 문서는 관찰 절차와 증거 경계를
정의하며, **관찰 전에 사용자 유용성을 주장하지 않는다.**

## 수집 데이터와 경계 (구현된 계약)

- 저장 위치: 모바일 MMKV `graph_local_metrics_v1` 키 / 데스크톱 `localStorage`
  `glimpse_graph_local_metrics_v1` 키. 외부 전송 없음(텔레메트리 없음).
- 여정 단계(`packages/features/src/graph/journey.ts`): `capture` / `discovery` / `revisit`.
  항목 식별자는 **FNV-1a 32bit 해시**뿐이며 원문 id·제목·본문·URL·프롬프트·API 키는
  절대 저장하지 않는다.
- 만료: 단계는 24시간(TTL) 후 폐기. 배열 상한 60단계, latency 표본 상한 20개.
  동일 이벤트는 60초 쿨다운 내 1회만 기록(dedupe).
- 상관 규칙: capture는 **카드에 그 항목의 해시가 실제로 포함된** discovery에만,
  discovery는 **같은 항목 해시의 revisit**에만 1:1로 속한다. 각 capture/discovery는
  최대 1회 속성되므로, 이후 무관한 discovery 사이클이 상관으로 계산되지 않는다.
- 분모: 비율의 분모는 만료·dedupe 후의 관측 이벤트 수(capture 수 / discovery 수)이며,
  매칭 수를 분모로 쓰지 않는다.
- v1→v2 이전: 기존 카운터 보존, 여정은 빈 배열로 시작, 알 수 없는 필드는 재구성
  객체로 이전되지 않는다(내용 유입 차단).

## 1주 관찰 절차 (사전등록)

1. **기간**: 일반 사용 7일 이상 (설치 직후부터 자연 사용). 테스트용 대량 입력 금지.
2. **관찰 질문**:
   - Q1. 저장된 항목이 24시간 안에 발견 카드로 다시 노출되는가?
     (`captureToDiscoveryRatio`, `captureToDiscoveryLatenciesMs` 중앙값)
   - Q2. 발견 카드를 연 뒤 실제로 항목을 다시 여는가?
     (`discoveryToRevisitRatio`, 중앙값 latency)
   - Q3. 그래프 사이클 지연이 관찰 기간 내 예산(기존 `recentDurationsMs` 분포) 안인가?
3. **읽는 법**: 기간 말에 양 플랫폼 저장값을 JSON으로 덤프해
   `parseGraphLocalMetrics` → `computeGraphJourneyMetrics(metrics, { now: Date.now() })`
   로 집계한다. 순수 함수이므로 덤프 재계산이 항상 가능하다.
4. **성공 기준 (관찰 전 확정 — 유용성 주장이 아닌 관찰 충족 기준)**:
   - 최소 표본: capture ≥ 5, discovery ≥ 5, 기간 7일.
   - Q1: ratio ≥ 0.4 그리고 중앙값 latency ≤ 24시간.
   - Q2: ratio ≥ 0.5.
   - Q3: 최근 20사이클 중앙값이 기존 기준치 내.
   - 미충족 시: 기능 실패가 아니라 관찰 결과로 기록하고 원인(표본 부족·단계 미발생)을 구분한다.
5. **금지**: 이 문서의 성공 기준 충족을 "사용자 유용성 측정·입증"으로 표현하지 않는다.
   유용성 주장은 별도의 사람 관찰/인터뷰 근거가 필요하다.

## 실모델 vs 가짜 벡터 증거 경계

- 결정적·합성 벡터 테스트(가짜 임베딩)는 **배선(wiring) 증거**일 뿐 의미 품질 증거가 아니다.
- 실제 의미 검색·연결 품질 평가는 기기에 다운로드된 실제 `.gguf` 모델이 있어야만 가능하다.
  2026-09-06 기준 시뮬레이터 앱 Documents에 모델이 없어(런타임 노트) **실모델 의미 품질은
  미측정**이다.
- 기존 synthetic planner receipt는 계속 `synthetic-pure-planner-and-aggregation`으로 표시되며,
  GUI E2E 결과·사람 관찰 결과와 별개로 인용해야 한다.

## 이번 구현의 검증 기록 (2026-09-06, HEAD 093520a 작업 트리)

| 검증 | 명령 | 결과 |
| --- | --- | --- |
| 공유 여정 코어+이전 | `bun test packages/features/src/graph` | 25 pass, 0 fail |
| 플랫폼 store 계약 | `bun test apps/mobile/src/features/graph apps/desktop/src/features/graph` | 23 pass 포함 48 pass, 0 fail(그래프 11파일 전체) |
| features 전체 회귀 | `bun test packages/features` | 116 pass, 0 fail |
| 모바일 캡처 회귀 | `bun test apps/mobile/src/features/capture` | 66 pass, 0 fail |
| 그래프 GUI E2E | `bunx playwright test --config playwright.graph-gui.config.ts` (apps/desktop, 사전 `vite build`) | 2 passed — 발견 카드 항목 열기 → `discovery`+`revisit` 단계 기록, 원문 제목 미저장 확인 |
| 셸 캡처 E2E | `bun run test:e2e:shell-capture` | 1 passed — 캡처 성공 → `capture` 단계 1회, 제목 미저장 확인 |

- E2E는 프로덕션 vite 번들+IPC 스텁 픽스처에서 **실제 앱 코드 경로**(store→journey)를 검증한다.
  상태를 바꾸는 실기기 데이터 변형은 없다.
- 부모 오케스트레이터가 최종 lint/typecheck/build/전체 smoke을 소유한다. 이 범위에서는
  집중 테스트만 실행했다.
- 캡처 성공 이벤트는 모바일 `useSaveKnowledgeItemMutation.onSuccess`, 데스크톱
  `CaptureModal` 저장 성공 콜백에 연결됐다. 셸(Tauri) 캡처도 데스크톱에서는 같은 모달을
  거치므로 동일 계약을 따른다.

## 남은 한계

- revisit은 "상세 화면 열림"으로 정의한다. 라이브러리 목록·검색·발견 카드 어느 경로든
  동일하게 기록되며, 경로 구분은 discovery 해시 매칭으로만 이뤄진다.
- 24시간 TTL 안에 발견 카드가 갱신되지 않으면 Q1 표본이 그만큼 줄어든다(설계상 보수적).
- 사용자 유용성, 발견 카드 품질, 실모델 의미 검색 품질은 이 프로토콜로 측정되지 않는다.
