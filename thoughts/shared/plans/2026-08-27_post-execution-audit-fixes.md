# 사후 감사 결함 수정 구현 계획

## 개요

어제 실행된 개선 항목의 감사에서 발견된 P0 2건·P1 11건·소액 P2를 수정한다. 도메인이 독립적이므로 Phase별로 서브에이전트가 실행하며 각 Phase는 스스로 테스트·린트 게이트를 통과해야 끝난다.

## 현재 상태 분석

### 주요 발견사항 (검증 완료)

- `packages/features/src/recommendation/index.ts:140`와 `edge-parser.ts:49-50`: 원문 NUL 바이트(`\0`) 실재 확인 — 이스케이프 교체 시 런타임 문자열 동일(behavior 무변화)
- `apps/desktop/src/app/_authenticated/review.tsx:6-13`: 로컬 `calculateNextInterval(base*2)` 존재 확인. `packages/hooks/src/mutations/useReviewMutations.ts`는 stability/difficulty 미패치
- `apps/mobile/src/features/core/native-core-fallback-client.ts:105-127`: postponed 시 `FORGOTTEN_REVIEW_INTERVAL_MS`(4h) 하드코딩, remembered/forgotten 계산이 코어와 유사하지만 별제 구현 확인
- 공유 review 패키지(`packages/features/src/review/`)의 `adjustIntervalFromFeedback.ts`와 `actions.ts`가 모바일 단일 출처 역할 중 — 데스크톱 진입 경로는 `@glimpse/hooks`
- 승자-판정 버그: `index.ts:71-77`의 Map 생성이 DESC 배열을 먹어 최고(oldest)-이김. `statusVerdict(edge.status)` 함수 이미 존재(152-156행)
- edge 파서: `edge-parser.ts:14-18` 전체 슬라이스 파싱. `sanitizeEdges` 게이트는 견고(38-61행)
- `process-share-data.ts`: 불리언 반환, 부분 실패 시 clear 안 됨(호출부 `pending-share-processor.ts`)
- chat `summarizeReasoning`: `index.ts:221` 정규식 백트래킹 O(n²). 종결부호 집합은 `[.!?。]`
- 동기화: 서버 지문 스킵은 `server.rs`에서 `core.snapshot_fingerprint()`와 `client_fingerprint` 비교; 모바일은 직전 응답 지문 저장 후 재전송(`sync-client.ts`) — 의미 오용 확정
- `glimpse-desktop-bridge.d.ts`의 `@glimpse/core` 참조는 skipLibCheck 은폐 하의 데드 타입

### 따라야 할 패턴

- 순수 로직은 `packages/features` 공유 구현 + 앱 쪽 얇은 위임자(chat/share/process-share-data 선례)
- 테스트는 기존 bun test(`*.test.ts`, node/native 프로젝트 구분 준수) + cargo test(`#[cfg(test)] mod tests`)
- 브릿지 변경 시 `bun run bridge:generate` 후 generated 3종 커밋
- UI 색상은 DESIGN.md 토큰 (`text-app-destructive` 등 존재하는 토큰 사용)

## 목표 상태

SPEC `thoughts/shared/specs/2026-08-27_post-execution-audit-fixes.md`의 성공 기준 전부 충족.

## 범위 제한 (하지 않을 것)

- 델타 동기화 프로토콜, 매분 전체 재작성 구조, 코어 전역 락, tailscale 추가 제거
- llama.cpp 임베딩 컨텍스트 재사용 리팩터(debounce+상한으로 증상 완화)
- 모바일 semantic 연결, OCR/미디어 파이프라인 전환, CI E2E/tauri build 게이트, 페널티 시간 창(제품 결정)
- bun.lock / overrides 임의 변경, eslint 메이저 정렬
- 라벨 '금융' 표기 되돌리기

## 구현 접근 방식

7개 Phase, 파일 집합이 서로 겹치지 않아 순차 실행 충돌 없음. 각 Phase 끝에 자체 검증(아래 명령) 필수. Phase 2만 브릿지 regen을 수반하므로 generated 파일 다른 Phase와 접촉 금지. Phase 5(iOS)는 환경 제약으로 xcodebuild 검증 불가 → 문법 신중 변경 + TS 측 테스트 + 커밋 메시지 명시.

---

## Phase 1: 동기화 내구성 (P0 지문 스킵 + 401 + Host + P2)

**파일**: `apps/desktop/src-tauri/src/sync/server.rs`, `config.rs`, `packages/core-rust/src/storage/sqlite/sync.rs`, `apps/mobile/src/features/sync/{sync-url.ts,sync-client.ts,sync-url.test.ts,background-task.ts}`

1. **[P0] 지문 스킵 교정** — 스킵 판정을 "실제 콘텐츠 동일"로. 권장 접근: 서버가 수신 스냅샷 페이로드를 정규화(툼스톤 deleted_at=0 등 기존 정규화 재사용)해 해시를 계산하고 자기 `snapshot_fingerprint()`와 비교, 동일할 때만 `None`(병합 생략). 클라이언트가 보내는 값의 의존을 제거하고 `client_fingerprint` 없이 판정 가능하게. 스냅샷 역직렬화 실패 시엔 항상 병합(fail-open). core-rust에 스냅샷→지문 헬퍼(예: `fingerprint_of_snapshot`) 노출 필요 시 추가. 회귀 테스트: "양방향 동기화 후 한쪽만 변경된 스냅샷은 생략되지 않고 병합된다", "내용 동일 스냅샷 재전송은 생략된다".
2. **[P1] 401 판별** — `fetchJson`에서 응답 상태 코드를 담은 에러(`HttpError extends Error { status }`)로 throw. `isAuthErrorMessage`를 `isAuthError(error: unknown): boolean`(status===401)로 대체, 정규식 제거, 테스트 갱신("Desktop 요청 실패 (401)" 문자열 의존 테스트도 상태코드 기반으로).
3. **[P1] Host 검증 축소** — 허용 조건을 "host_only가 IpAddr로 파싱되며 사설/루프백/링크로컬" 또는 "`<자기 ts.net 이름>.ts.net` 접미사 일치" 또는 "mDNS 광고명과 정확 일치"로. 임의 도메인:포트 거부. 테스트: `evil.com:{port}` 거부, `{name}.ts.net:{port}` 허용.
4. **[P2] 스큐 폴백 오염 완화** — 병합 적용 타임스탬프를 `min(candidate_ts, now + MAX_CLOCK_SKEW_MS)`로 클램프(sync.rs). 오염 레코드 이후 재편집이 recency 비교 회복하는 테스트.
5. **[P2] fetch 리다이렉트 차단** — 모바일 fetch 옵션에 `redirect: 'error'`.
6. **[P2] background-task catch에 logger.warn 추가.**

### 성공 기준

#### 자동 검증
- [ ] `bun test apps/mobile/src/features/sync/` 통과(신규 401/지문 테스트 포함)
- [ ] `cargo test -p glimpse-core --lib sqlite::sync` 통과 + `bun run desktop:rust:check` 통과
- [ ] server.rs host/fingerprint 유닛 테스트 신규 포함(cargo test src-tauri)

#### 수동 검증
- [ ] 실기기 페어링 후 모바일 변경이 즉시 데스크톱 반영(GUI 체크리스트 항목) — 커밋 메시지에 미검증 명시

---

## Phase 2: 복습 스케줄러 수렴 (P1×3 + 색상 토큰)

**파일**: `apps/desktop/src/app/_authenticated/review.tsx`, `src/components/review/ReviewDeck*`, `packages/hooks/src/mutations/useReviewMutations.ts`, `apps/mobile/src/features/core/native-core-fallback-client.ts`, `apps/mobile/src/components/review/ReviewItemCard.tsx`, 삭제: `packages/core-rust/src/core_client/review.rs`의 `calculate_next_review` 관련, `packages/bridge-rust/src/io/review.rs` 해당 io, `packages/bridge-rust/generated/*`(regen)

1. **단일 출처 확정** — 데스크톱 화면이 `@glimpse/features` review 액션(`calculateNextReviewState` 등 기존 export)으로 간격 산출. `useReviewMutations`가 stability/difficulty까지 패치(NullableValue 아님: 항상 값 산출 후 설정). remembered/forgotten/postpone 3액션 연결 — forgotten은 모바일 ReviewItemCard의 선례 참조해 ReviewDeck에 버튼 추가. postpone은 nextReviewAt만 패치(기존 훅 재사용).
2. **폴백 클라이언트 정렬** — `native-core-fallback-client.ts`의 계산 분기를 `@glimpse/features`의 `calculateNextReviewState` 호출로 대체(FORGOTTEN_REVIEW_INTERVAL_MS 등 하드코딩 제거). 파일 상단 미러 주석도 갱신.
3. **Rust 데드 코드 삭제** — `calculate_next_review #[command]`와 전용 io 제거, `bun run bridge:generate` 재생성, generated diff 커밋. 관련 cargo 테스트(review.rs tests) 함께 제거하되 `initialize_review_schedule` 등 살아있는 명령은 유지. TS 골든 테스트 1건 추가(고정 입력 → 고정 interval/stability/difficulty).
4. **stability 상한** — 공유 TS 구현에 `MAX_STABILITY_DAYS = 365 * 5` 클램프(Inf 직렬화 경로 차단). 모바일 폴백은 위임이라 자동 동일.
5. **[P2] elapsed 데드 파라미터** — 주석과 달리 무효이므로 상한을 scheduled가 아닌 `stability*2`로 변경 후 테스트 고정(주석 정합화).
6. **ReviewItemCard 신규 X 아이콘 색상** → destructive 토큰 치환.

### 성공 기준

#### 자동 검증
- [ ] `bun test packages/features/src/review apps/mobile/src/features/review apps/mobile/src/features/core` 통과 + 크로스 경계 동등성 테스트(모바일 액션 vs 폴백 vs 데스크톱 진입 함수 — 동일 입력 동일 출력)
- [ ] `cargo test -p glimpse-core --lib` 및 `cargo check` 통과, `bun run bridge:generate` 후 generated 깨끗
- [ ] `bun run desktop:typecheck` 통과(데스크톱 화면 시그니처 변경 반영)

#### 수동 검증
- [ ] 데스크톱 리뷰 화면에서 remembered/forgotten/postpone 동작과 due 리스트 갱신(GUI)

---

## Phase 3: 추천·그래프 견고성 (P1×3 + P2)

**파일**: `packages/features/src/recommendation/{index.ts,edge-parser.ts}`, `apps/desktop/src/features/graph/generate-knowledge-graph.ts`, `apps/desktop/src/hooks/useKnowledgeGraphAutomation.ts`, `apps/mobile/src/features/recommendation/{proposeEdgesWithAI.ts,refreshRecommendations.ts}`, 관련 테스트

1. **verdict 최신-이김** — 피드백 Map을 createdAt ASC 정렬 후 구성(최종=최신), 판정 우선순위는 `statusVerdict(edge.status) ?? latestFeedbackVerdict`. 중복 이벤트(accept 후 dismiss) 시나리오 테스트 추가.
2. **edge 파서 재작성** — 코드펜스 제거 → 문자열 스캔으로 JSON 후보 배열 추출(중첩 대괄호 균형 카운팅) → 요소 단위 완화 파싱(트레일링 콤마 제거, 완결 객체는 잘림 후에도 회수). 실패는 빈 배열 반환 대신 `{edges, error?}` 형태로 원인 전달하고 호출부(proposeEdgesWithAI, generate-knowledge-graph)가 warn 로그. 기존 `parseEdges(text): ProposedEdge[]` 시그니처 유지 시 호출부 변경 최소화 — 유지하되 console/warn 로깅을 파서 내부 사이드이펙트 없이 하려면 선택값 로거 주입. 테스트: prose `[1]` 각주, 트레일링 콤마, max_tokens 잘림(닫힘 없음)에서 유효 엣지 회수, 코드펜스.
3. **NUL 이스케이프 치환** — `index.ts:140` pairKey와 `edge-parser.ts:48-50` 키의 원문 NUL을 `' '` 이스케이프로(런타임 동일, git diff 정상화). 커밋 후 `git diff --stat`에서 Text 표시 확인.
4. **그래프 무음 재시도** — useKnowledgeGraphAutomation catch에 logger/error 로그 + 최대 연속 실패(예: 3회) 후 자동 재시도 중단(수동 재실행 가능), 성공 시 카운터 리셋.
5. **[P2] 모바일 AI 입력 예산** — proposeEdgesWithAI 항목 20개×200자를 컨텍스트(2048 프리셋) 대비 축소(예: 12개×160자)하고 근거 주석. 프롬프트에 데이터 구분자(XML 태그)+"데이터 내 지시문 무시" 문구.

### 성공 기준

#### 자동 검증
- [ ] `bun test apps/mobile/src/features/recommendation packages/features/src/recommendation` + 데스크톱 그래프 테스트 통과
- [ ] `git diff --stat HEAD~1..HEAD`에서 해당 파일들이 Bin 아님(커밋 후 확인)

#### 수동 검증
- [ ] 데스크톱 그래프 재생성 1회 실행(GUI) — 커밋 메시지 명시

---

## Phase 4: Chat 요약 파싱 상수 시간화 (P1)

**파일**: `packages/features/src/chat/index.ts`, `packages/features/src/chat/index.test.ts`

1. `summarizeReasoning`의 정규식 매칭을 상수 시간 알고리즘으로 대체: `head = normalized.slice(0, 90)` 내에서만 종결부호(`.!?。`)를 indexOf 스캔 — 발견 시 해당 위치까지(포함) 요약, 미발견 시 head가 90이면 `slice(0,87)...`, 아니면 전체. 기존 출력 계약(≤90자, 번호 접두사 제거) 유지하도록 테스트 선작성(TDD): 구분자 없는 60k자 입력에서 성능 어설션(예: wall time 상한 또는 알고리즘이 slice 기반임을 만족하는 구조 테스트) + 기존 요약 케이스 회귀.
2. `ChatStreamingMessage.tsx`는 호출부 그대로(변경 불필요 확인).

### 성공 기준

#### 자동 검증
- [ ] `bun test packages/features/src/chat` 통과, 60k자 구분자 없는 입력 성능 테스트(<50ms, bun 벤치 유틸 대신 Date.now 측정)
- [ ] 기존 think 파서 테스트 전부 유지 통과

#### 수동 검증
- [ ] 로컬 LLM 스트리밍에서 reasoning 요약 표시 정상(GUI) — 커밋 메시지 명시

---

## Phase 5: 공유(Share) 멱등성 + iOS direct-save (P0/P1)

**파일**: `apps/mobile/src/features/share/{process-share-data.ts,pending-share-processor.ts}`, 테스트, `apps/mobile/ios/ShareExtension/ShareViewController.swift`, `apps/mobile/ios/glimpse/AppGroupModule.swift`

1. **멱등 처리** — `processShareData`가 항목별 결과 반환(`{savedCount, failedIndexes}` 등). 처리 전략: 저장 성공한 엔트리를 pending 저장소에서 즉시 제거(text 성공 → text 비움, URL 각각 성공 → 해당 항목 제거)해 재실행 중복 원천 차단, 남은 것이 있으면 clear 안 함. pending-store에 부분 갱신 API 없으면 추가(네이티브 키 형식 불변). 멱등성 테스트: text 성공+URL 1개 실패 → 재실행 시 text 재저장 없음.
2. **iOS direct-save 폐쇄** — 현실 최소안 선택: (a) `saveImageDirectly`가 App Group UserDefaults에 pending 미디어 레코드(키 분리 권장: `ll3.krShareMedia`)를 기록하고 AppGroupModule이 읽어 TS가 회수하는 경로를 완성하거나, (b) 이미지 direct-save 분기를 제거해 legacy redirect로 폴백하되 legacy가 이미지를 유실한다면 알럿 문구를 "앱에서 마저 저장해야 함"으로 정직화. **(a) 우선 시도, 과대해보이면 (b)**. 결정과 이유를 커밋 메시지에 기록. 동시에 text/url 같은 키 clobber(P2)도 타입별 키 분리로 함께 수리 가능하면 수리.
3. xcodebuild 불가 환경 → Swift 변경은 최소 문법 신중 수정 + `bun test` TS 측만 게이트.

### 성공 기준

#### 자동 검증
- [ ] `bun test apps/mobile/src/features/share` 통과(멱등성 신규 테스트 포함)
- [ ] tsc/lint 통과(mobile)

#### 수동 검증
- [ ] 실기기: 이미지 공유 → 앱 진입 시 아이템 생성 확인(GUI 체크리스트, 미검증 시 명시)

---

## Phase 6: 의미 검색 계약 고정 + 폭주 완화 (P1×2 + P2)

**파일**: `apps/desktop/src/features/local-llm/desktop-llm-service.ts`, `apps/desktop/src-tauri/src/{models.rs,commands.rs}`, `apps/desktop/src/features/search/useSemanticRerank.ts`, `apps/desktop/src/types/glimpse-desktop-bridge.d.ts`, 루트 `package.json`

1. **계약 고정** — `models.rs`의 `EmbeddingRequest/EmbeddingResponse` 필드명(serde rename 여부 포함)을 1차 확인 후 `desktop-llm-service.ts` 페이로드를 정확히 일치(`{runtimeId|runtime_id, modelId|model_id, input}` / 응답 `{vector}`). 타입 수준 계약 테스트(desktop vitest/bun 환경 확인 후 그에 맞게) 또는 최소 컴파일 타임 타입 단언. 실패 1회 `console.warn` 로그(catch 삼킴 제거).
2. **메인 스레드 해방** — `run_embedding` command를 `async fn` + `spawn_blocking`으로 전환(내부 뮤텍스는 블로킹 클로저 안에서 유지). `cargo check` 게이트.
3. **폭주 완화** — `useSemanticRerank`: 250ms debounce, `MAX_EMBED_ITEMS` 100→30, 캐시 키에 로드된 모델 id 포함(`${modelId}:${item.id}:${item.updatedAt}`).
4. **데드 d.ts 정리** — `glimpse-desktop-bridge.d.ts`가 참조하는 `@glimpse/core` 경로를 실제 타입 재수출로 교체하거나 파일 삭제(typecheck 통과 조건).
5. **루트 lint 스크립트** — `"lint": "bun run --cwd apps/mobile lint && bun run --cwd apps/desktop lint"`.

### 성공 기준

#### 자동 검증
- [ ] `cargo check` 통과(async command), `bun run desktop:typecheck` + `bun run desktop:lint` 통과
- [ ] 의미 검색 관련 기존 테스트 통과(useSemanticRerank에 테스트 있으면), semantic.test.ts 유지
- [ ] `bun run lint`(루트)가 양 앱 모두 실행하는 것 출력으로 확인

#### 수동 검증
- [ ] BYOK 설정 후 데스크톱 검색에서 의미 정렬 활성화·타이핑 지연 없음(GUI, 미검증 명시)

---

## Phase 7: 최종 검증 + 문서

1. 전체 게이트: `bun test`(전체), `bun run lint`, `bun run typecheck`, `bun run desktop:lint`, `bun run desktop:typecheck`, `cargo check`, `cargo test -p glimpse-core --lib`
2. 리서치 문서 후속 섹션에 실행 결과 기록(SPEC/플랜 링크, 커밋 해시)
3. 커밋은 Phase별(또는 논리 그룹별) 분리, 각 메시지에 검증 명령·결과와 미검증 수동 항목 명시

## 테스트 전략

- **단위**: 각 Phase의 신규/변경 순수 로직(backoff류처럼 bun 단독 가능 구조 유지), TDD — 실패 테스트 선작성 후 수정
- **통합(Rust)**: sync.rs 병합 시나리오 테스트(지문 생략/수행 분기), review 삭제 후 core 전체 lib 테스트
- **수동(GUI)**: 실기기 동기화, 데스크톱 리뷰/그래프/검색, iOS 공유 — 환경상 불가한 항목은 커밋에 명시적으로 미검증 표기

## 성능 고려사항

- summarizeReasoning: 상수 시간화로 스트리밍 누적 비용 제거(Phase 4 성능 테스트로 고정)
- 임베딩: debounce+30개 상한으로 최악 IPC/디코드 횟수 축소, async command로 UI 프리즈 제거
- 추천: 이번 범위 밖(페널티 시간 창 등 제품 결정) — 캐싱은 현행 유지

## 참고 자료

- SPEC: `thoughts/shared/specs/2026-08-27_post-execution-audit-fixes.md`
- 리서치: `thoughts/shared/research/2026-08-27_00-24-30_post-execution-audit.md`
- 유사 구현: `process-share-data.ts` factory-deps 패턴, `adjustIntervalFromFeedback.test.ts` 골든 케이스, `backoff.test.ts` bun 단독 테스트 구조
