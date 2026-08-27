---
date: 2026-08-27T00:24:30+0900
researcher: loopy
git_commit: 09caa5b894280dd4066bb9920cc8eed7a4f9f920
branch: main
repository: Glimpse
topic: "어제 실행된 개선 항목(A1~C4) 신규 코드 감사 — 수정 필요 목록 도출"
tags: [research, codebase, audit, sync, review-fsrs, recommendation, chat, share, semantic-search, ci]
status: complete
last_updated: 2026-08-27
last_updated_by: loopy
---

# 리서치: 어제 실행된 개선 항목(A1~C4) 신규 코드 감사 — 수정 필요 목록 도출

**날짜**: 2026-08-27T00:24:30+0900
**연구자**: loopy
**Git Commit**: 09caa5b894280dd4066bb9920cc8eed7a4f9f920
**Branch**: main
**Repository**: Glimpse

## 연구 질문

프로젝트의 문제점을 많이 찾아달라. 직전 리서치(2026-08-26_15-20-14)의 실행 결과물(ad57955..HEAD, 9커밋 약 3,300줄)은 아직 감사된 적이 없으므로, 해당 범위 + 기존 결함 중 감사 미범위를 5개 독립 도메인으로 병렬 감사한다.

## 조사 구조

독립 도메인 5개 병렬 디스패치:

1. 동기화 내구성 (backoff/GC/클록 스큐/Host 검증 수정물 정합성)
2. 복습 FSRS-lite (Rust↔TS 경계·알고리즘 수학·마이그레이션)
3. 추천·라벨링 수렴 (LLM 파서 견고성·인젝션·수렴 유실)
4. Chat·Share 리팩터 회귀 (think 파서·share 원자성)
5. 의미 검색 + CI/빌드 인프라

## 요약

**발견 총계: P0 2건, P1 11건, P2 20여 건.** 어제 "완료"로 커밋된 기능 중 3개가 실제로는 동작하지 않거나 절반만 동작한다:

| 커밋 | 주장 | 실제 |
|---|---|---|
| dd3e8c4 지문 스킵 | 불필요한 병합 생략 | **반대로 모바일 변경을 대량 유실** (P0) |
| 35e12bd 의미 검색 | 임베딩 재정렬 활성화 | **TS↔Rust 계약 불일치로 한 번도 작동 안 함** (P1) |
| 79fd1a0 FSRS-lite | 양측 동일 스케줄 | **데스크톱은 구 2배 규칙 그대로 갈라짐** (P1) |

### 최우선 (P0)

1. **동기화 지문 스킵 오용** — 서버가 "클라이언트가 기억하는 데스크톱 과거 지문"을 "변화 없음" 판정에 사용. 데스크톱 자신이 바뀌기 전까지 모바일의 모든 변경이 영구 미반영되는데 양쪽 UI는 "동기화됨"
2. **iOS Share Extension 이미지 direct-save가 참조 미영속화** — "저장 완료" 알럿 후 조용한 데이터 유실 (이번 범위 밖 기존 결함)

### P1 목록 (도메인별)

- 동기화: ①401 판별 dead path (메시지 정규식이 실제 응답 형식과 불일치) ②Host 검증 우회 (`attacker.example.com:포트` 통과 — 리바인딩 방어 9c9763e의 목표 미달)
- 복습: ③데스크톱 구 2배 규칙 갈라짐(clamp 부재·급수 성장·sync 충돌 뒤집기) ④Rust FSRS 스케줄러(+213줄) 런타임 호출부 0개 — 사실상 데드 코드, 3벌 구현 ⑤네이티브 폴백 클라이언트 상수 갈라짐(postponed 4h vs 코어 10분)
- 추천: ⑥피드백 verdict가 최신이 아닌 최고(oldest) 이벤트로 덮어써짐 — dismiss가 accepted로 판정되어 차단·페널티 오계산 ⑦edge 파서 첫 `[`~마지막 `]` 통째 파싱 — prose 내 대괄호/트레일링 콤마/max_tokens 512 잘림에 유효 엣지까지 전부 폐기 ⑧공유 파일 2곳에 원문 NUL(U+0000) 바이트 — git diff가 Bin으로 숨겨져 리뷰 불능
- Chat/Share: ⑨`summarizeReasoning` 정규식 구분자 없는 입력에서 O(n²) — 스트리밍 재파싱과 곱연산되어 수 초 프리즈 (실측 120k자=10.4초) ⑩공유 처리 부분 실패 시 멱등성 없음 — 매 포그라운드마다 text 공유 중복 저장 누적
- 검색: ⑪임베딩 계약 불일치(run_embedding 호출이 `missing field 'runtime_id'`로 즉시 실패, `catch {}`가 은폐) + 키스트로크당 최대 101회 순차 llama.cpp + 동기 command 메인 스레드 프리즈

## 상세 분석

### 도메인 1. 동기화 내구성 (ad57955..HEAD 수정물)

**[P0] 지문 스킵 조건 오용** — `apps/desktop/src-tauri/src/sync/server.rs:225-238`. 서버는 `client_fingerprint == 현재 자기 지문`이면 스냅샷 입력을 버리고 병합을 생략. 그런데 모바일(`sync-client.ts:158-163`)이 보내는 값은 자기 콘텐츠 지문이 아니라 **직전 응답에서 저장한 데스크톱 지문**이다. 실패 시나리오: 동기화 완료(지문 F_D 저장) → 모바일에서만 노트 10개 생성 → 자동 SYNC에서 데스크톱 지문==F_D라 병합 생략 → 모바일 변경은 데스크톱이 우연히 자체 변경(그래프 생성 등)으로 지문이 바뀔 때까지 영구 반영 안 됨. 폰 중심 사용자의 캡처가 수 주간 유실되는데 양쪽 다 "동기화됨". 스킵 판정은 "양쪽 중 변화 있음"을 봐야 하는데 "데스크톱만의 변화"를 보고 있다. 방향: 수신 스냅샷에 정규화 해시를 적용해 자기 지문과 비교하거나, 클라이언트가 자기 현재 스냅샷 지문을 보내도록 코어에 노출.

**[P1] 401 판별 dead path** — `sync-url.ts:32-34`의 `/\(401\)/.test(message)`인데 `fetchJson`은 서버 본문 `message`(항상 한국어 문장)를 우선 throw하므로 "(401)" 접미사가 안 붙는다. 재페어링 필요 상태(`invalidated`) 분기가 전부 미도달, 일시실패처럼 최대 30분 백오프 무한 재시도. 방향: 상태 코드를 에러 객체에 명시 전달 후 제거.

**[P1] Host 검증 우회** — `server.rs:145-146`: `host.ends_with(":포트") && 호스트부가 IP 아님` → 허용. 즉 공격자 도메인 `evil.com:34129`가 정확히 이 조건을 만족해 통과(DNS 리바인딩 페이로드 그 자체). 완화요인: CORS preflight 차단(JSON+Authorization). 십진수 정수 IP(`2130706433`)도 같은 구멍. 방향: 허용 호스트명을 `.ts.net` 접미사/mDNS 광고명 정확 일치로 좁힘.

**[P2]** 원격 오염 미래 타임스탬프 무클램프(스큐 폴백이 사전순 JSON 비교라 year-3000 고착 가능, `sync.rs:294-326`), 모바일 fetch `redirect` 옵션 부재(302 따라가며 Authorization 유출 경로, `sync-client.ts:228-249`), `background-task.ts:28-30` catch가 실패 사유 소멸.

**검증된 정상**: 지문 정규화(volatile 필드 제거, 결정적 ORDER BY, 툼스톤 deleted_at=0 정규화), 툼스톤 GC 실작동(그레이스 30일+재생성 보호 단위테스트), 스큐 폴백 양방향 수렴, 백오프 상태머신(공유 상태·성공 리셋·홀드가 exportData보다 선행해 백오프 중 직렬화 비용 없음), `syncPromise` 중복 실행 dedup, BEGIN IMMEDIATE 직렬화, client-server 계약(경로·필드·protocolVersion) 일치, 페어링 글로벌 시도 상한/로테이션/프루닝, tailscale CLI 풀 이동. `bun test apps/mobile/src/features/sync/` 8 pass.

### 도메인 2. 복습 FSRS-lite (79fd1a0 및 후속)

**[P1] 데스크톱 갈라짐** — `apps/desktop/src/app/_authenticated/review.tsx:6-36`와 `packages/hooks/src/mutations/useReviewMutations.ts:10-37`이 여전히 로컬 `base*2` 규칙(clamp 없음 → 연속 remembered 시 기하급수) + forgotten 버튼 없음. 동일 DB sync 시 데스크톱의 비정상 간격을 모바일이 되돌리고 updatedAt 충돌로 last-write-wins 뒤집기 반복.

**[P1] Rust 스케줄러 데드 코드** — `packages/core-rust/src/core_client/review.rs`(+213줄)의 `calculate_next_review #[command]` 프로덕션 호출부 0개. 실제 스케줄은 TS 미러(`adjustIntervalFromFeedback.ts`)가 결정. 이미 Rust `(stability*DAY_MS) as i64` 절단 vs TS `Math.round` 드리프트 존재.

**[P1] 네이티브 폴백 갈라짐** — `apps/mobile/src/features/core/native-core-fallback-client.ts:15,105-110,123`이 postponed=4h 하드코딩(코어는 10분), stability 하락 계수 0.35는 상수 유도가 아니라 마법수. 폴백은 실제 트리거 관측됨(JSI unavailable 로그).

**[P2]** "실제 경과 시간" 인자가 `.min(interval)` 클램프 탓에 항상 stability 이하가 되는 데드 파라미터(주석과 달리 6개월 늦은 회상도 기한 내 회상과 동일 성장), 레거시 행 부트스트랩 `stability ?? 0.5` 탓에 20~30일 간격 행이 첫 피드백 후 ~23시간으로 급락, 세 테스트 파일의 등호 기대치를 넓은 부등식으로 완화(스케줄러 망가짐 미감지), stability_days 무상한 ×1.52 성장(≈1,500회 연속 시 f64 Inf → serde_json 직렬화 실패/TS null patch 경로), `ReviewItemCard.tsx:151` 신규 아이콘 `#d4432e` 하드코딩.

**검증된 정상**: 단위 전 구간 밀리초 일관(Rust i64 ms, SQLite INTEGER ms, TS DAY_MS), 분모 0 가드·미래/음수 elapsed 처리 양측, Rust `as i64` saturating, forgotten 실제 수축(stability×0.35 floor 0.3일)+difficulty cap 10, postpone 상태 보존, 브릿지 generated 3종 리젠+camelCase 일치+`#[serde(default)]` 하위호환, KnowledgeItemPatch NullableValue 영속화 완결, 기억 안 남 mutation invalidate 정상, `bun test` 모바일 85 pass + `cargo test --lib review` 10 pass.

### 도메인 3. 추천·라벨링 (d366b65, 832e410, 87f3616)

**[P1] verdict 최고(oldest)-이김** — `packages/features/src/recommendation/index.ts:71-77`이 DESC 정렬 피드백 배열을 Map에 담아 마지막 삽입(=가장 오래된) 이벤트가 남음. accept→dismiss 흐름이 'accepted'로 판정되어 거절 차단(rejectedPairs) 누락+태그 페널티 상쇌 오계산.

**[P1] edge 파서 전체 폐기** — `edge-parser.ts:14-18`: `indexOf('[')`~`lastIndexOf(']')` 슬라이스라 prose 내 `[1]` 각주 하나로 start 오염→[], 트레일링 콤마→[], 모바일 BYOK `max_tokens:512` 잘림(닫는 괄호 없음)→[]. 실패가 무로그라 "AI 엣지 생성이 사실상 거의 항상 빈 배열" 폐루프가 관측 불가.

**[P1] 원문 NUL 바이트** — `recommendation/index.ts:140(pairKey)`, `edge-parser.ts:49-50(sanitizeEdges 키)`에 ` ` 이스케이프가 아닌 실제 U+0000 제어 바이트 → git diff가 두 파일을 Bin 표시(d366b65의 리뷰가 사실상 무력화). 런타임 동작 동일.

**[P2]** 모바일 AI 제안이 2048 컨텍스트 프리셋 대비 ~4천 토큰 입력(잘림→조용한 []), 프롬프트 인젝션(노트 본문 구분자 없음, reason 300자 컷이라 피해는 엣지 오염+스푸핑 한정), 그래프 실패 무로그+15분 무한 재시도(최대 시도 없음, `useKnowledgeGraphAutomation.ts:48-61`), 피드백 루프 O(edges×items) find·무경계 existing 조회·페널티 시간창 부재, 데스크톱 finance 라벨 '재무'→'금융' 표기 변경(무해하나 미문서화).

**검증된 정상**: sanitizeEdges 셀프루프/미지id/중복쌍 거부+300자 컷, 3개 생성 경로 모두 거절 차단+DB 레벨 ON CONFLICT DO NOTHING+동기화 canonicalize_recommendation_pairs, respondToRecommendation 원자성, refreshPromise 동시 가드, digest 24개 윈도우 정렬 일치, 라벨러 수렴 무손실(룰/키워드/priority/산식 완전 동일), 추천·라벨링·그래프 테스트 26 pass.

### 도메인 4. Chat·Share 리팩터 (d3cace7)

**[P1] summarizeReasoning O(n²)** — `packages/features/src/chat/index.ts:221`의 `/(.+?[.!?。]|.{1,90})(\s|$)/`가 공백·종결부호 없는 입력(한국어/코드/URL 나열)에서 완전 2차 스케일(실측 15k=153ms, 120k=10.4초). `ChatStreamingMessage.tsx:11`이 스트리밍 토큰마다 전체 버퍼 재파싱해 닫힌 `<think>` 없는 스트림에서 O(n³)까지 증폭, JS 스레드 수 초 stall. exponential ReDoS는 아니지만 체감 크래시급.

**[P1] 공유 부분 실패 비멱등** — `process-share-data.ts:54-79`가 text 저장 후 webUrl `Promise.all` 중 하나 reject면 전체 실패 처리, `clearPendingShareData()` 미호출 → 이미 저장된 text가 다음 포그라운드마다 새 id로 재복제. 배치 원자성도 없고 불리언 반환으로 무엇이 저장됐는지 호출부가 모름.

**[P0, 기존 결함·범위 밖] 이미지 direct-save 유실** — `ios/ShareExtension/ShareViewController.swift:322-337,517-523`: `saveImageDirectly`가 App Group에 파일만 카피하고 pending 레코드(UserDefaults) 기록이 전혀 없어 앱이 절대 못 가져옴 — 사용자에게는 "저장 완료" 알럿. 고아 파일도 계속 적립. video/pdf/vcard는 direct 분기 자체가 없어 legacy redirect만 탐.

**[P2]** think 파서 복수/중첩/역순 태그 한계(두 번째 블록이 answer에 원문 노출 등 — 커밋 전과 동일한 기존 한계이나 수렴으로 단일 구현이 된 지금이 정리 적기), direct-save 모드에서 text/url가 같은 키(`ll3.krShareKey`)에 Array/Data 타입 상이 기록으로 clobber(기존 결함).

**검증된 정상**: 패키지 이동이 순수 재수출(시그니처 동일, 소비자 2곳 자동 이행), 핵심 수정 유효(구현 ZWSP 상수 열림=닫힘 버그를 신규 테스트가 잡음 — tautological 아님), 데스크톱은 파서 미소비라 쌍둥이 버그 없음, `​` 잔존 사용처 없음, 테스트 11 pass, `isProcessing` 플래그로 중복 실행 방어.

### 도메인 5. 의미 검색 + CI (35e12bd, 4c737a9)

**[P1] 임베딩 계약 불일치 → 데드 피처** — 프런트 `desktop-llm-service.ts:63-72`가 `invoke('run_embedding', { request: { text } })` / `{embedding, tokensUsed, modelId}` 기대. Rust `models.rs:67-80`은 `{runtime_id, model_id, input}`(serde default 없음) / `{vector}`. 역직렬화 즉시 실패하며 `useSemanticRerank.ts:92` `catch {}`가 삼켜 keyword 순서 폴백 — 로드돼도 "의미 정렬"이 영원히 미활성화. 로그 없음.

**[P1] 임베딩 폭주+프리즈** — `SearchBar.tsx:16-30` debounce 없음 → effect가 키스트로크마다 IPC 2회+100개 순차 await 임베딩. `commands.rs:113-120`의 sync fn이 메인 스레드 점유 + 호출마다 새 llama.cpp 컨텍스트 생성, `llm_engine` 뮤텍스 때문에 채팅 completion까지 대기.

**[P2]** 벡터 없는 항목 무조건 -1 강등(정확 키워드 매치가 저유사 벡터 항목에 밀림·유사도 하한 임계값 부재), 캐시 키 `${id}:${updatedAt}`에 모델 id 없음(모델 교체 시 이종 벡터 공간 혼합·길이 불일치=0점·인메모리 캐시라 세션마다 재계산), 모바일은 semantic 미연결(격차 확정), CI 커버리지 임계값 없는 리포트 전용(tauri build 검증·E2E 여전히 부재), `glimpse-desktop-bridge.d.ts:10`이 삭제된 `@glimpse/core` 참조(skipLibCheck가 any로 은폐 — 위 P1을 typecheck이 잡았어야 할 자리), eslint 10 도입 부작용으로 bun.lock 조용한 메이저 점프(zod 3→4 등, 선언 범위 내·직접 소비 0건), 루트 `bun run lint` 여전히 mobile 하드코딩(package.json:37).

**검증된 정상**: cosine zero-vector/NaN/길이 불일치 가드(semantic.ts:17-27), 빈/단일 결과 안전, react-query 캐시 오염 없음·원본 배열 비파괴 sort, 오류 시 keyword 폴백+runId 경합 차단, 데스크톱 eslint 실질 게이트(error 레벨), llm-off 빌드 임베딩 영벡터 대신 에러 반환, `--frozen-lockfile`+bridge generated diff 검증.

## 미해결 질문

1. Rust `calculate_next_review`를 진짜 주 경로로 올릴 것인가(bridge 호출 우선+TS 폴백), 아니면 의도된 미러 유지 후 향후 전환인가 — 브릿지 JSI 상황(poll) 고려 필요
2. iOS 이미지 direct-save 참조 영속화의 데이터 계약(media 필드 vs 별도 pending 키) — ShareExtension Swift→TS 파이프라인 설계 필요
3. 데스크톱 Host 허용 정책 — `.ts.net` 접미사만이면 되는지 mDNS 광고명 정확 일치까지 필요한지
4. 추천 거절 페널티 시간창/감쇠 도입 여부(제품 결정)
5. 모바일 semantic 검색 연결 예정 여부(llm.setEmbedding 정책)

## 코드 참조

핵심 근거(커밋 09caa5b 기준):
- `apps/desktop/src-tauri/src/sync/server.rs:145-146,206-217,225-238` — Host 검증/401 본문/지문 스킵
- `apps/mobile/src/features/sync/{sync-url.ts:32-34,sync-client.ts:138-163,228-249}` — 401 정규식/지문 전송/fetch 옵션
- `apps/mobile/src/features/share/process-share-data.ts:54-79`, `apps/mobile/ios/ShareExtension/ShareViewController.swift:322-337,498-523`
- `packages/features/src/chat/index.ts:221-259` — summarizeReasoning/think 파서
- `apps/desktop/src/features/local-llm/desktop-llm-service.ts:63-72,239` ↔ `apps/desktop/src-tauri/src/models.rs:67-80`
- `apps/desktop/src/components/library/SearchBar.tsx:16-30`, `apps/desktop/src/features/search/useSemanticRerank.ts:37-101`, `apps/desktop/src-tauri/src/commands.rs:113-120`
- `apps/desktop/src/app/_authenticated/review.tsx:6-36`, `packages/hooks/src/mutations/useReviewMutations.ts:10-37`, `apps/mobile/src/features/core/native-core-fallback-client.ts:105-123`
- `packages/features/src/recommendation/{index.ts:71-77,140, edge-parser.ts:14-18,49-50}`
- `packages/core-rust/src/storage/sqlite/sync.rs:294-326`

## 히스토리 컨텍스트 (thoughts/ 디렉터리)

- `thoughts/shared/research/2026-08-26_15-20-14_next-improvement-opportunities.md` — 직전 리서치+실행 기록(본 감사의 모 대상)
- `thoughts/shared/research/2026-08-19_00-37-04_remaining-work-stabilization-audit.md` — 이전 감사 체인

## 관련 리서치

- `thoughts/shared/research/2026-08-26_15-20-14_next-improvement-opportunities.md`
- `thoughts/shared/research/2026-08-19_22-30-00-rustra-0.1.3-cancel-contract.md`

## 후속 단계

발견 전체를 `/create_spec`으로 수정 SPEC화 → `/create_plan` → sub-agent 구현. 범위 권고: P0 2건+P1 11건 전부, P2는 소요 소액(NUL 이스케이프, redirect:error, 로그 추가, 색상 토큰, 캐시키 모델id, 상한 cap, 황금 테스트) 포함 — 대형 P2(델타 프로토콜, 이미지 파이프라인 전환, 모바일 semantic 연결, CI E2E)는 별도 스펙으로 분리.

## 실행 결과 (2026-08-27)

브랜치 `fix/post-execution-audit`에서 6개 구현 Phase 실행(sub-agent), 커밋 순서대로:

- **a7e57ac** chat 요약 O(n²) 제거(60k자 2.3초→<1ms, 성능 게이트 테스트 신설)
- **3c144eb** 추천: verdict 최고-이김 수정(+부수 발견: action enum 불일치로 accept가 항상 rejected로 계산되던 버그), edge 파서 재작성(각주/트레일링 콤마/잘림 내성+로깅), NUL 원문 이스케이프 치환(git diff 바이너리 해소), 그래프 무음 재시도 완화, AI 입력 예산 축소+XML 구분자
- **0109288** share: 배치 멱등성(성공 엔트리 즉시 제거→중복 저장 원천 차단), iOS direct-save 폐쇄(P0 유실 경로, legacy redirect 합류+알럿 정직화), URL 전용 키 clobber 해소
- **102a37f** sync [P0]: 지문 스킵을 수신 스냅샷 실콘텐츠 해시 비교로 교정(fail-open 2겹, 봉투 버전 검증 선행), 401 HttpError{status} 판별 활성화, Host 허용 집합 축소(evil.com:{port} 거부), 미래 타임스탬프 클램프, fetch redirect 차단
- **c6e6402** review: 3벌 스케줄러(TS 미러/네이티브 폴백 하드코딩/데스크톱 구 2배 규칙)을 공유 calculateNextReviewState로 수렴 + 크로스 경계 동등성 테스트, Rust 데드 명령 삭제+regen, MAX_STABILITY_DAYS 클램프
- **b64ac1c** search: 임베딩 TS↔Rust 계약 고정({runtimeId,modelId,input}/{vector} — 데드 피처였던 의미 재정렬 수리), run_embedding async+spawn_blocking, debounce/상한/모델 id 캐시키, d.ts 정리, 루트 lint 양앱 연쇄

최종 게이트(전체): bun test 653 pass / 0 fail · cargo glimpse-core lib 45 pass · src-tauri 27 pass · desktop:rust:check · 양앱 lint/typecheck 통과. bridge:generate 후 generated diff 없음(클린).

SPEC: `thoughts/shared/specs/2026-08-27_post-execution-audit-fixes.md` / 플랜: `thoughts/shared/plans/2026-08-27_post-execution-audit-fixes.md`

**GUI 수동 검증 미수행(후속)**: 실기기 동기화 반영, 데스크톱 리뷰 3버튼 플로우, BYOK 후 의미 정렬 활성, iOS 공유 이미지 경로 — 체감 검증은 실기기 필요. 남은 대형 과제는 SPEC 범위 제한 섹션 참조(델타 동기화, 임베딩 컨텍스트 재사용, 모바일 semantic 연결, CI E2E).
