---
date: 2026-08-26T15:20:14+0900
researcher: loopy
git_commit: ad57955e8b557f80bbb54413a7de4d5ce359c345
branch: main
repository: Glimpse
topic: "동기화·그래프 직후 다음에 발전시킬 가치 있는 개선 거리"
tags: [research, codebase, sync, knowledge-graph, roadmap, tech-debt]
status: complete
last_updated: 2026-08-26
last_updated_by: loopy
---

# 리서치: 동기화·그래프 직후 다음에 발전시킬 가치 있는 개선 거리

**날짜**: 2026-08-26T15:20:14+0900
**연구자**: loopy
**Git Commit**: ad57955e8b557f80bbb54413a7de4d5ce359c345
**Branch**: main
**Repository**: Glimpse

## 연구 질문

데스크톱-모바일 동기화와 지식 그래프를 커밋·푸시한 직후, Glimpse에서 다음으로 발전시킬 가장 가치 있는 것은 무엇인가?

## 조사 구조

4개 영역을 병렬 조사했다:

1. 동기화·그래프 기능 자체의 완성도 갭 (신규 코드 심층 분석)
2. 제품 비전 ↔ 실제 구현 갭 (비전 문서 기준 기능별 상태)
3. 기술부채·품질 (TODO, 파일 크기, 테스트 공백, 중복 로직, CI)
4. thoughts/docs에 기록된 잔여 작업 (과거 계획의 미완료 분)

## 요약

4개 영역 병렬 조사 완료. 차기 개선 거리는 세 범주로 수렴한다:

**A. 끊어진 제품 루프 (비전-구현 갭)** — 가장 가치 높음:
1. **라벨링 dead code** — 저장 시 `labelStatus: 'pending'` 설정 부재로 자동 태깅 파이프라인 전체가 작동하지 않으며, 모바일 추천(태그 기반)까지 연쇄 마비. 수정 자체는 소규모
2. **복습 알고리즘 미완성** — 망각 곡선이 비전의 핵심 차별점인데 실제는 고정 2배 규칙. FSRS 필드는 이미 준비됨
3. **추천 품질 폐루프 부재** — 피드백이 빈도에만 반영되고 생성 품질에는 미반영
4. **의미 검색 부재** — 임베딩 캐패비리티가 레지스트리에만 존재, 사용처 0
5. **모바일-데스크톱 지능 격차** — "AI 자동 연결"이 데스크톱에만 존재

**B. 방금 커밋한 동기화·그래프의 내구성 결함** — 데이터가 쌓일수록 악화:
1. 매 분 전체 DB 재작성 + 병합 중 전역 코어 락 (성능·UI 블록)
2. 툼스톤 GC 무작동 (스냅샷 무한 증가)
3. 클록 스크우 병합 무방비, 백오프 없는 재시도, 블로킹 tailscale 서브프로세스 등

**C. 구조·품질 부채** — 장기 속도에 영향:
- 테스트 공백 (chat/sync/packages/features), 모바일-데스크톱 중복 9쌍, CI 게이트 부재 (데스크톱 lint/커버리지/E2E)
- 기록된 잔여: GUI 수동 검증 26항목 미체크, OCR 등 mvp 스펙 이월 항목, rkyvV2/contractHash

**권장 우선순위**: A1(라벨링) → B(동기화 내구성) → A2(복습 알고리즘) → A3/A4 → C 병행. A1은 비용 대비 효과가 압도적이고, B는 시간이 지나면 데이터 손상 위험이 커지며, A2~A4는 제품 차별점 완성이다.

## 상세 분석

### 영역 3. 기술부채·품질 (조사 완료)

**TODO 마커**: 사실상 없음 — 검출건은 전부 오탐(테스트 픽스처 문자열, 라벨 i18n 값).

**파일 복잡도** (400줄 초과 2개):
- `apps/mobile/src/features/ai/targets/executors.ts` — 537줄
- `apps/desktop/src/features/ai/providers/byok-provider.ts` — 454줄
- 임계 근접(250줄+): mobile `local-llm.ts`(350), mobile `byok-provider.ts`(326, 데스크톱판과 별개 복제물), `llama-service.factory.ts`(322), `sync-client.ts`(251) 등

**테스트 공백** (최대 항목):
- `apps/mobile/src/features/chat/` — 11개 소스, 테스트 0
- `apps/mobile/src/features/sync/` — 5개 소스(신규 동기화 기능 전체), 테스트 0
- `packages/features`의 capture|chat|library|recommendation|review|search 전체 테스트 0 — 테스트가 apps 쪽 중복 구현에 붙어 있어 수렴 시 이전 필요

**모바일/데스크톱 중복** (packages/features 수렴 후보 9쌍):
- `features/labeling/rule-based-labeler.ts` — 사실상 동일(210 vs 212줄, 차이는 라벨 번역어 1개). 수렴 최우선
- `features/core/rustra-core-client.ts` — "Mirrors the desktop adapter" 명시된 의도적 복제
- `features/ai/providers/{local-llm,byok}-provider.ts` — 동일 명칭 별개 구현
- `hooks/useForegroundLabeling.ts` — 시그니처까지 다름, `@glimpse/hooks` 통합 여지

**Rust 테스트 커버리**: core-rust 28개 소스 중 21개 무테스트 (application/*, core_client/* 대부분, storage/sqlite 도메인별 파일). bridge-rust 커맨드 핸들러 대부분 무테스트.

**CI 빠진 게이트** (ci.yml 4잡):
- 데스크톱/모바일 E2E 전무 (Playwright/Detox/Maestro 미설정)
- 데스크톱 릴리스 번들(tauri build) 검증 잡 부재
- 데스크톱 lint 게이트 없음 (`bun run lint`가 mobile 하드코딩, root package.json:37)
- 데스크톱 커버리지 없음, audit 수준 critical뿐(high 미차단)
- 네이티브(Swift/Kotlin) 유닛테스트 잡 없음

### 영역 4. 기록된 잔여 작업 (조사 완료)

**반복 등장 미해결 주제** (문서 간 교차 검증):
1. JSI 네이티브 이벤트 배선 — 5개 문서 반복, 2026-08-19 라운드 3에서 완료로 종결
2. rkyvV2 fast path — 5개 문서에서 이월 사슬, "무기한 보류" 상태로 여전히 열림
3. contractHash 드리프트 검증 — 미사용, fast path 이전 활성화 후보
4. 뮤텍스 오염(rustra 엔진 자체 회복) — design doc의 유일한 미완료 잔여, rustra 측 기능 필요
5. **GUI 수동 검증 체크리스트** — 26개 항목 전부 미체크, 전 안정화 문서에서 미실행 (P0)
6. eas.json 자격증명/출시 시점 — 사용자 액션으로 분리
7. `llm` feature 기본 활성화 방침 — "별도 결정"으로 계속 미룸
8. **OCR 미구현** — mvp1 스펙 제외 → 스텁 저장 → 현재까지 실구현 없음
9. Sentry/크래시 리포트 — 라운드 2에서 선택형 진단 reporter로 부분 해결, 도입 결정 미료
10. 제품 로드맵 열린 질문 (추천 UX 형태/빈도, 싱크 — 싱크는 이번에 해소)
11. 데이터 동기화 — **본 리서치 직전 커밋(1a6ef9c..ad57955)으로 해소**

**mvp 스펙의 "범위 제외" = 사실상 차기 제품 백로그**:
- OCR 추출 파이프라인 (스크린샷 → 텍스트화)
- 파일 첨부(이미지/PDF/동영상) 처리
- 임베딩/의미 검색, 벡터DB 연동
- Apple Intelligence 실연동 (부분 상태)
- 사용량/과금 추적

**문서 위생**: 안정화 스펙 2건 frontmatter가 `status: draft`로 방치(계획은 COMPLETE), mvp 인덱스 성공 기준 체크박스 전부 미체크.

### 영역 1. 동기화·그래프 완성도 갭 (조사 완료)

**심각도 높음**:
- **매 분 전체 DB 재작성** — `merge_data`(core-rust/storage/sqlite/sync.rs:23-29)가 로컬 전체 export → 병합 → `replace_all_data`(모든 행 DELETE 후 재삽입) → 전체 export. 모바일이 60초마다 트리거(useAutoSync.ts:31). 델타 동기화/변경 감지 전무, 데이터 증가에 비례해 비용·플래시 마모 증가
- **병합 중 전역 코어 락** — server.rs:165-169의 `spawn_blocking`이 `core_state()` 전역 Mutex를 병합 내내 유지(bridge-rust/src/state.rs:107-111). 대형 병합 중 데스크톱 UI 전체 블록
- **툼스톤 GC 무작동** — `remove_stale_tombstones`(sync.rs:305-339)의 유지 조건이 실제 삭제된 엔티티에서는 항상 참이 되어 모든 툼스톤이 영구 잔존. 매 스냅샷에 포함되어 payload와 O(툼스톤×레코드) 스캔이 무한 증가
- **클록 스큐 무방비 병합** — `prefer_candidate`(sync.rs:247-254)가 벽시계 `updated_at`만 비교. 기기 시계 어긋나면 느린 기기의 수정이 조용히 패배. 벡터 클록/버전 카운터/미래 시각 거부 없음
- **비동기 핸들러 내 블로킹 서브프로세스** — server.rs:139,195에서 `tailscale status --json`·`serve status --json`을 `std::process::Command::output()`로 동기 실행(tailscale.rs:17-89). 매 sync 요청+10초 폴링마다 tokio 워커 블록
- **백오프 없는 60초 재시도** — 오프라인에서도 매 분 전체 스냅샷 직렬화 후 엔드포인트마다 15초 타임아웃 대기(sync-client.ts:197-237). 지수 백오프/연결성 감지 없음

**심각도 중간**:
- `graphQueued` 하드코딩 true — 서버가 실제 없는 큐잉을 주장(server.rs:196), 그래프 실행은 digest 폴링과 무연결
- 그래프 실패 무한 재시도 — `.catch(() => undefined)`로 digest 미기록, sync마다 LLM 재실행(useKnowledgeGraphAutomation.ts:40-48)
- 페어링 속도 제한 우회 가능 — IP당 분 5회만, 전체 상한/실패 누적 로테이션 없음, `pair_attempts` 맵 키 프루닝 없음(config.rs:248-265)
- 백그라운드 작업이 401(토큰 무효)과 일시 실패 미구분 — 매 15분 영구 실패 반복(background-task.ts:21-23)
- 서버 측 sync 타임아웃 없음 — 클라이언트 중단 후에도 병합 계속, 재시도 시 대형 병합이 전역 락에 직렬 누적
- 그래프 digest가 실제 입력(최신 24개)과 불일치 — 25번째 이전 항목 수정에 불필요한 재계산. `MAX_ITEMS=24`는 문서 미기재 하드 리밋, 증분 처리 없음
- LAN 평문 HTTP로 토큰 전송 + 토큰 만료·로테이션 정책 없음 — 탈취 시 영구 유효(config.rs:187-203)
- Host/Origin 검증 부재 — DNS 리바인딩 표면, `/v1/health` 무인증으로 device_id/name 노출(server.rs:93-100)
- 삭제-재생성 시나리오에서 옛 항목+툼스톤 공존, `conversation_clock`이 소프트 삭제와 하드 삭제 축 혼용(sync.rs:341-345)

**심각도 낮음**: health의 `pairing_required` 상수 true, 동률 타이브레이크 매 비교 JSON 재직렬화, mark_seen 매 요청 디스크 쓰기, 모바일 이중 직렬화(parse→stringify), 레이아웃 useMemo 부재, mDNS 재발견 오류 무음 삼킴, 페어링 직후 초기 sync 실패가 페어링 실패로 표시, device_id 타이밍 누출.

**구현 검증된 약속**: 코드 로테이션(config.rs:201), 상수시간 토큰 비교(config.rs:299), Tailscale 443 보호(tailscale.rs:100-108), 고아 엣지 정리(sync.rs:189-197)는 문서대로 동작.

### 영역 2. 비전-구현 갭 (조사 완료)

| 비전 기능 | 상태 | 근거 |
|---|---|---|
| 입력 채널 5종 (링크/메모/하이라이트/스크린샷/공유) | 구현됨 | `packages/features/src/capture/types.ts:3-23`, iOS Share Extension, OCR 네이티브(Vision/ML Kit, 한글 인식) |
| 자동 태깅/요약 | **부작동 (치명적)** | 파이프라인 전부 존재하지만 **저장 시 `labelStatus: 'pending'`을 설정하는 코드가 없음** — `save.ts:69`가 `null`로 저장, 큐는 `'pending'`만 조회(`knowledge.rs:167`) → 라벨러·백그라운드 태스크·포그라운드 스케줄러 전부 dead code |
| 추천 생성·다이제스트 | 부분 | 모바일은 태그 중복 O(n²) 매칭만, 데스크톱만 LLM 그래프 엣지 생성 — **"AI 자동 연결"이 기기마다 다름** |
| 사용자 반응 폐루프 | 부분 | 수용률→빈도(3/7/14일) 폐루프는 작동. 그러나 **품질 폐루프 없음** — 피드백이 추천 생성 알고리즘에 미반영 |
| 망각 곡선/복습 | 부분 | **에빙하우스/FSRS/SM-2 없음** — `remembered=2배, 1~30일 클램프`가 전부(`review.rs:15-16`). `stability`/`difficulty` 필드는 존재하나 항상 `None`. postponed가 간격을 늘리지 않음(매일 같은 항목 재노출). 초기 간격 TS=10분 vs Rust=24시간 불일치 |
| 로컬 검색 | 부분 (키워드만) | 키워드+한글 초성. **임베딩/의미 검색 전무** — 모델 레지스트리에 embedding 캐패비리티 정의만 있고 사용처 0 |
| AI 전환 경계 (5종 타겟) | 구현됨 | stub/rules/apple/local/byok 라우팅, Apple Intelligence iOS 26+ 실구현, BYOK 3사 |

**연쇄 효과**: 모바일 추천이 태그 중복 기반이므로 라벨이 비면 추천도 생성되지 않음 → 비전의 핵심 가치("AI가 자동 연결")의 첫 단추가 끊어진 상태. 수정 비용은 사실상 수줄이지만 제품 전체 활성화를 결정.

## 미해결 질문

1. 라벨링 큐 부재가 의도된 스텁인가 실수인가 — mvp 스펙의 "라벨링 파이프라인 제외" 선언과 충돌하는지 원문 확인 필요
2. 복습 초기 간격 불일치(TS 10분 vs Rust 24시간) 중 어느 쪽이 의도인가
3. `llm` feature 기본 활성화 방침 — 모바일 로컬 LLM 추천·임베딩 확장 전에 선행 결정 필요
4. 동기화 델타 프로토콜 도입 시점 — 전체 스냅샷에서 증분으로 전환하는 스키마 버전 v3 필요 여부
5. GUI 수동 검증 26항목의 진실 소스 — integration-plan 체크리스트와 디자인 문서 어느 쪽을 기준으로 할지

## 코드 참조

주요 근거 파일 (커밋 ad57955 기준):
- `apps/mobile/src/features/capture/application/save.ts:69` — labelStatus null 저장
- `packages/core-rust/src/storage/sqlite/knowledge.rs:167` — pending 필터
- `packages/core-rust/src/core_client/review.rs:11-16` — 복습 간격 규칙
- `packages/features/src/recommendation/index.ts:48-90` — 태그 중복 추천
- `packages/core-rust/src/storage/sqlite/sync.rs:23-29,247-254,305-339` — 병합/툼스톤
- `apps/desktop/src-tauri/src/sync/server.rs:139-198` — sync 핸들러
- `apps/mobile/src/hooks/useAutoSync.ts:31` — 60초 주기
- `apps/desktop/src/features/graph/generate-knowledge-graph.ts:6-7` — MAX_ITEMS=24

## 히스토리 컨텍스트 (thoughts/ 디렉토리)

- `thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md` — 제품 비전 원천 (망각 곡선, 자동 연결 차별점)
- `thoughts/shared/research/2026-08-19_00-37-04_remaining-work-stabilization-audit.md` — 직전 잔여 감사 (JSI 배선은 이후 완료)
- `thoughts/shared/specs/mvp1/03-screenshot-capture-stub.md` 등 — "범위 제외"로 미뤄둔 제품 항목들
- `docs/plans/2026-08-16-rustra-integration-design.md:225-229` — rustra 통합 잔여 (뮤텍스 오염 등)

## 관련 리서치

- `thoughts/shared/research/2026-08-19_00-37-04_remaining-work-stabilization-audit.md`
- `thoughts/shared/research/2026-08-18_23-15-53_stabilization-backlog.md`

## 후속 단계

리서치 완료. SPEC/계획 문서로 이어가려면 `/create_spec` 실행.
