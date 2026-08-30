---
date: 2026-08-30T22:15:27+09:00
researcher: Claude
git_commit: 3928e06e2f708c017bb2233686b4dbfcd3116dd1
branch: main
repository: Glimpse
topic: "AI 기능 정상 동작 검증(LLM·임베딩·백그라운드) 및 라이선스(MIT 등) 컴플라이언스 점검"
tags: [research, codebase, ai, llm, embedding, background-task, license, compliance, byok, local-llm]
status: complete
last_updated: 2026-08-30
last_updated_by: Claude
---

# 리서치: AI 기능 검증 및 라이선스 컴플라이언스

**날짜**: 2026-08-30 22:15 (KST)
**연구자**: Claude
**Git Commit**: 3928e06 (main)
**Branch**: main
**Repository**: Glimpse

## 연구 질문

1. 현재 AI(LLM·임베딩·백그라운드 처리)가 제대로 되어 있는가? 특히 백그라운드에서 AI가 잘 동작하는가?
2. MIT 등 라이선스 관련 컴플라이언스는 잘 되어 있는가?

## 요약

**AI 기능은 의도된 경로(모바일 로컬 채팅 스트리밍·BYOK 채팅/메타데이터·데스크톱 스트리밍+임베딩 RAG)에서 기능적으로 완결되어 있으나, 백그라운드 AI는 "거의 존재하지 않는" 것이 현재 상태다.** 백그라운드 태스크는 sync(60분)+라벨링(60분) 2개뿐이고, 임베딩·추천·RAG는 전부 포그라운드 전용이며 앱이 백그라운드로 가면 중단/해제된다. iOS에서 로컬 LLM 백그라운드 라벨링은 구조적으로 불가능(30초 예산 < 모델 로드 시간)하다.

**라이선스는 코드 의존성 기준 클린하다** — npm·Rust 그래프에 강한 카피레프트(GPL/AGPL/SSPL)가 전무하고 MPL-2.0은 파일 레벨이라 독점 배포와 호환된다. 단 **프로젝트 자체는 MIT가 아니라 독점(all-rights-reserved) 라이선스**이며, 진짜 노출은 AI 모델 카탈로그다: 기본 추천 모델 LFM2.5와 Kanana·EXAONE·HyperCLOVA·Gemma가 커스텀/비허용적 라이선스다. THIRD-PARTY-NOTICES 파일이 없어 배포 시 허용적 라이선스조차 고지 의무를 채우지 못한 상태다.

## 상세 분석

### 1. AI 코어 아키텍처 — 채팅·메타데이터 (모바일)

엔드투엔드 채팅 흐름 (`apps/mobile/src/hooks/chat/useChat.ts:67`):
1. `resolveEffectiveTarget('chat')` → 컨텍스트 조립 `buildChatKnowledgeContext` (`apps/mobile/src/features/ai/chat-context.ts:64`) — **모바일 채팅 RAG는 키워드 기반만** (상위 3개 아이템).
2. **local 경로** (`useChat.ts:91-128`): 공유 런타임 싱글턴 → `generateStream` (maxTokens 512) → 80ms 스로틀 스트리밍 → 부분 저장. Abort 경로 완비 (`useChat.ts:192`).
3. **byok 경로** (`useChat.ts:129-154`): 단발 non-streaming fetch. **모바일 BYOK 채팅은 스트리밍되지 않음** (스트리밍 인프라는 존재).
4. stub/apple/rules 채팅은 명시적 에러 + 설정 다이얼로그 (`useChatAISetup.ts:55-75`) — 의도된 동작.

메타데이터/라벨링은 실제 AI로 동작: capture → `metadataRouter.generate` (`apps/mobile/src/features/ai/metadata/router.ts:47`) → apple(네이티브 모듈 실존)/local(llama.rn)/byok(HTTP). `stub-provider.ts`는 설정된 타깃이 파싱 불가일 때만 선택되는 의도된 폴백.

**발견된 결함 (모바일)**:
- **죽은 inference-mode 서브시스템**: `inferenceMode.commands.ts` 호출자 0건, 실제 라우팅은 100% ai-targets 시스템. `features/core/application/state/inference-mode.ts`의 기본값(`activeMode:'local'`)은 실제 기본(stub)과 모순.
- **타깃 모델 핀 무시**: `parseAITargetId`가 `target.modelId`를 만들지만 executor(`executors.ts:156-201`)는 라이브 스토어를 재조회 — 모델 A로 고정된 타깃이 현재 선택된 모델 B로 실행됨.
- **`AI_PROVIDER_TIMEOUT` 미생산** (`metadata/types.ts:35`): 어느 fetch에도 타임아웃/AbortSignal 없음 — BYOK 호출 hang 시 채팅·메타데이터 무한 대기.
- **BYOK 메타데이터 경로에 hydration 가드 부재**: 채팅 경로의 `ensureBYOKHydrated()`(`executors.ts:335`)와 달리 `byok-provider.ts:241-250`은 스토어 직접 조회 — 콜드스타트 레이스 시 "BYOK is not configured" 실패 가능.
- **`getLabelVersion`이 BYOK을 rules 버전으로 오분류** (`executors.ts:124-135`).
- **Effect 변형·스트림 허브 반쯤 죽음**: `executeChatTargetEffect` 등 5개 Effect에 비테스트 호출자 없음. `stream-events.ts` 허브의 subscribe 헬퍼는 앱 코드 소비자가 전무.
- 스트리밍 델타 로직(`local-llm/runtime.ts:127-139`): `sanitizeOutput`이 축소되면(닫히지 않은 `<think>` 등) 델타가 일시 유실 — 설계된 트레이드오프.

### 2. AI 코어 (데스크톱)

- `router.ts` 단일 `aiProvider` 설정이 전 기능 구동. 그러나 **실제 데스크톱 라벨링은 라우터를 우회해 `deriveRuleBasedLabels` 직접 호출** (`run-foreground-labeling.ts:30`) — **데스크톱 라벨링은 aiProvider와 무관하게 rules-only**.
- **공칭 응답 버그**: provider가 빈 텍스트 반환 시 `I received your message about "..."` 가짜 응답 조립 (`router.ts:135-137`) — 에러 대신 위 응답이 채팅에 표시됨.
- BYOK SSE 스트리밍 정상 (401/403/429 비재시도 포함, `byok-provider.ts:404-424`).
- 채팅 RAG: 임베딩 기반(임계값 0.55, 최대 5항목), 메시지마다 최대 100개 재임베딩(캐시 없음, TODO 명시, `chat-generation.ts:96-97`).

### 3. 임베딩·시맨틱 검색·추천

**결론: 파이프라인은 양 플랫폼 기능적으로 완결·내부 일관성 있음.**

- **모바일 rerank 결정 순서** (`useMobileSemanticRerank.ts:174-188`): BYOK(OpenAI만, `byok-embedding-client.ts:16-18`) → 온디바이스 nomic(llama.rn 별도 컨텍스트, `on-device-embedder.ts:73-95`) → 비활성(키워드 순서 유지). 옵트인 기본 false (`semantic-settings.ts:21-23`).
- **데스크톱 배치 경로 완결**: TS wire → Tauri `run_embedding_batch` → 실제 llama.cpp `embeddings_batch` (`src-tauri/src/llm/engine.rs:290-339`). be3b516 계열 커밋 전부 현 브랜치 존재 확인.
- **추천**: `proposeEdgesWithAI`는 chat 타깃의 local|byok만 사용, 프롬프트 인젝션 가드·격자 파서(`edge-parser.ts`)·sanitize 완비, **실패 시 항상 `[]`로 태그 겹침 폴백**. `refreshRecommendations`는 적응형 케이던스(3/7/14일) 게이트 + AI 엣지 병합. 포어그라운드 마운트·`AppState 'active'`에서만 실행.
- 치명적 실패도 키워드 폴백으로 조용히 강등되는 **의도된 설계** — 단, 장애가 사용자에게 안 보임(각 모듈이 이 교훈을 주석으로 명시).

**갭**:
- **영구 벡터 저장소가 어디에도 없음.** `core-rust`에 미사용 `Embedding` 모델(`src/models.rs:333-337`)만 있고 테이블·마이그레이션·인덱스 전무. 세션마다 재임베딩 — BYOK 사용자는 같은 코퍼스에 세션별 토큰 비용 재지불. 현재 후보 캡이 30개라 동작할 뿐.
- 스펙(`2026-08-27_post-push-next-round.md:24`)은 bridge-rust nomic 경로를 계획했으나 구현은 llama.rn 직접 사용 — 기능적으론 스펙 성공 기준 충족.
- 데스크톱 배치가 요청별 `model_id` 무시 (`state.rs:422-429`) — 배치 중 모델 스왑 시 벡터가 조용히 변경됨.
- 데드 코드: `recommendationSimilarity.ts` 소비자 0건.
- **테스트는 전부 JS/Rust 와이어 경계 위의 모키톤** — 실제 모델·네트워크·llama.cpp를 걸치는 테스트 0건. 실 런타임 검증은 전적으로 수동 GUI에 의존.

### 4. 백그라운드 AI 처리 — 핵심 질문에 대한 답

**메커니즘은 2개뿐** (둘 다 `expo-background-task`+`expo-task-manager`, `app/_layout.tsx:140-146` 등록):
- **Sync 태스크** (`src/features/sync/background-task.ts:13-36`, 15분 최소 간격) — AI 없음.
- **Labeling 태스크** (`src/features/labeling/background-task.ts:24-31`, 60분) — **유일한 백그라운드 AI 작업** (LLM 라벨링, `runForegroundLabeling(3)`).

| AI 작업 | 백그라운드? | 근거 |
|---|---|---|
| 임베딩 백필 | 아니오 (앱 시작시 라벨 pending 마킹만) | `packages/hooks/src/queries/useLabelingBackfill.ts:25-39` |
| 시맨틱 rerank 임베딩 | 아니오 — 백그라운드 진입 시 컨텍스트 suspend | `useMobileSemanticRerank.ts:193-200` |
| 추천 갱신(AI 엣지) | 아니오 — 포그라운드만 | `useAppForegroundRecommendations.ts:45-50` |
| digest | 모바일에 존재하지 않음 (데스크톱 조회 전용) | `digest.tsx` |
| 복습 리마인더 | 알림 전용, AI 없음 | `expoReviewReminderScheduler.ts:69-82` |

**백그라운드에서의 실제 동작 문제**:
1. **iOS: `local` 타깃 백그라운드 라벨링은 구조적으로 불가능** — BGTaskScheduler 예산 ~30초 < 모델 로드 시간. `rules`/`apple`/`byok` 타깃은 가능. Android WorkManager는 ~10분이지만 JS 컨텍스트가 새로 뜨므로 `globalThis` 싱글턴이 비어 모델 재로드 필요 (`runtime-singleton.ts:42-46`, `runtime.ts:47-78`).
2. **30초 지연 언로드와 백그라운드 라벨링 간 레이스** — `useReleaseLocalLLMOnPressure.ts:19-28`이 백그라운드 진입 30초 후 `unloadSharedLocalLLM()` 하는데, 직후 시작된 bg 라벨링과 같은 싱글턴을 잠금 없이 공유 — 실행 중 태스크의 모델을 언로드할 수 있음.
3. **추론 중 백그라운드 전환**: iOS는 abort 없이 프로미스 동결(재개 또는 jetsam), Android는 프로세스 생존으로 30초 타이머가 발화해 스트림 도중 kill. 어느 쪽이든 우아한 중단 없음.
4. **플랫폼 설정**: iOS `UIBackgroundModes=[fetch,processing]`·BGTaskScheduler 식별자 정상 (`Info.plist:7-10,72-76`). Android `app.json:50-56`의 `RECEIVE_BOOT_COMPLETED`가 체크인된 병합 매니페스트에 없음(**prebuild 드리프트**). 시뮬레이터에선 BGTaskScheduler 미발화(`getStatusAsync` Unavailable) — 실기기만 검증 가능.
5. **데스크톱**: Rust에 예약 AI 작업 전무 — 모든 AI는 창이 열려 있을 때만. 창 닫으면 전부 중지.
6. **헤드리스 E2E는 sync만 검증, AI 경로 미포함** — 백그라운드 AI는 유닛 테스트만 존재(라벨링 bg 태스크), 실발화 검증은 전무.

### 5. 라이선스 컴플라이언스

**(a) 프로젝트 자체**: `LICENSE`는 **MIT가 아니라 독점 라이선스** ("No permission is granted to use, copy, modify, distribute..." — Copyright 2026 ll3-dev). 1차 Rust 크레이트 3개·`@glimpse/*` 6개 패키지에 `license` 필드 없음(내부용, 독점 스탠스와 일관).

**(b) npm 의존성 (~1,400개 조사)**: GPL/AGPL/SSPL/CC-BY-NC/"UNLICENSED" 전무. 비-MIT/Apache/BSD/ISC:
| 패키지 | 라이선스 | 평가 |
|---|---|---|
| lightningcss@1.30.2 | MPL-2.0 | 파일 레벨 약한 카피레프트, 상용 안전 (tailwindcss v4 경유) |
| node-forge@1.4.0 | BSD-3-Clause OR GPL-2.0 | 이중 — BSD 선택 |
| xdate@0.8.3 | MIT OR GPL-2.0 | 이중 — MIT 선택 |
| @fontsource-variable/geist | OFL-1.1 | 폰트 임베드 OK, 단독 재판매 불가 |

**(c) Rust 크레이트 (607개)**: 허용적이 아닌 것은 MPL-2.0 5개(dom_query·dirs-sys 경유, 파일 레벨이라 OK)와 CDLA-Permissive-2.0 1개(허용적 데이터 라이선스)뿐. **llama.cpp는 MIT** — `llama-cpp-2`/`llama-cpp-sys-2@0.1.154` (rev bed81ad) 래퍼도 MIT OR Apache-2.0 확인.

**(d) AI 모델 라이선스 — 최대 노출 영역** (`packages/shared/src/local-model-registry.ts`, 모델은 런타임 다운로드로 번들 안 됨):
- **플래그 — 커스텀/비허용적**: **EXAONE AI Model License 1.1** (rank 16, 상용에 LG 합의 필요 — 카탈로그 내 최대 제약) / **LFM 1.0**(LiquidAI, **기본 추천 모델 lfm2.5-2.6b-q4 포함 5개**) / **Kanana Open License**(kakaocorp, rank 2/6, 매출 임계 조건) / **HyperCLOVA X SEED**(NAVER, rank 17) / **Gemma**(Google 이용약관, rank 19).
- OK: Qwen3/3.5·MiniCPM5·Granite 등 전부 Apache-2.0, nomic-embed Apache-2.0.
- 소액: 데스크톱 전용 5개 엔트리(glm-4.7-flash 등)에 `license` 필드 자체가 없음.

**(e) 패치/공지**: `patches/expo-modules-jsi@57.0.6.patch`는 라이선스 영향 없음. **THIRD-PARTY-NOTICES/NOTICE 파일 부재** — MIT/BSD/OFL/Unicode/CDLA도 배포 시 고지 보존 의무가 있어 앱 번들용 생성 필요.

**종합 판정**: 코드 의존성은 상용/배포 기준 컴플라이언스. 리스크는 (1) 모델 카탈로그 — 특히 기본 추천 모델 LFM2.5의 커스텀 라이선스와 EXAONE의 상용 제약, (2) 서드파티 노티스 부재, (3) 자체 라이선스가 MIT 아닌 독점임(오픈소스화 의도가 있다면 별도 결정 필요).

## 코드 참조

- `apps/mobile/src/hooks/chat/useChat.ts:67-154` — 채팅 엔트리·local/byok 분기
- `apps/mobile/src/features/ai/targets/executors.ts:124-135,156-201,335,400` — 라벨 버전 오분류·모델 핀 무시·hydration 가드
- `apps/mobile/src/features/ai/local-llm/runtime-singleton.ts:42-46` — globalThis 싱글턴 (백그라운드 새 컨텍스트에서 소실)
- `apps/mobile/src/hooks/useReleaseLocalLLMOnPressure.ts:19-28` — 30초 지연 언로드 (bg 라벨링과 레이스)
- `apps/mobile/src/features/labeling/background-task.ts:24-31` — 유일한 백그라운드 AI 태스크
- `apps/mobile/src/features/search/on-device-embedder.ts:73-95,126-143` — 온디바이스 임베더 (직렬 루프)
- `apps/desktop/src/features/ai/router.ts:62,135-137` — provider 동일 사용 주석·공칭 응답
- `apps/desktop/src-tauri/src/llm/engine.rs:290-339` — 실제 llama.cpp 배치 임베딩
- `packages/core-rust/src/models.rs:333-337` — 미사용 Embedding 모델 (벡터 저장소 부재 증거)
- `packages/shared/src/local-model-registry.ts` — 모델 카탈로그 (라이선스 플래그 대상)
- `apps/desktop/src-tauri/Cargo.toml:20` — llama-cpp-2 rev 핀

## 아키텍처 인사이트

- AI 라우팅의 진실 소스는 ai-targets 시스템이며 inference-mode는 완전히 대체된 유령 코드 — 삭제 후보.
- 실패 철학이 "조용한 강등"(warn-once + 키워드/태그 폴백)으로 전 계층 일관 적용 — 견고하지만 장애 가시성이 0. 관측성(로그·설정 화면 배지)이 다음 과제.
- 백그라운드 전략은 "OS 태스크 2개(sync·라벨링) + 나머지 전부 포그라운드"라는 명시적 미니멀리즘. 로컬 LLM의 무거움(로드 시간>iOS 예산)이 구조적 상한.
- 검증 전략의 공백: 헤드리스 E2E는 sync만, 유닛은 모키톤만 — **실제 모델/네트워크를 걸치는 자동 검증이 0**. 수동 GUI 검증이 유일한 안전망.

## 히스토리 컨텍스트 (thoughts/ 디렉토리)

- `thoughts/shared/research/2026-08-30_20-46-17_remaining-development-tasks.md` — «폰 AI 설정 확인» 항목이 본 리서치의 직접 계기
- `thoughts/shared/specs/2026-08-27_post-push-next-round.md:24,34` — bridge-rust nomic 계획(미구현, llama.rn으로 대체)·성공 기준

## 관련 리서치

- `thoughts/shared/research/2026-08-30_20-46-17_remaining-development-tasks.md`
- `thoughts/shared/research/2026-08-27_13-07-25_large-next-steps.md`

## 미해결 질문

1. **기본 추천 모델을 Apache-2.0 계열(Qwen3.5 등)로 바꿀지** — LFM2.5의 커스텀 라이선스는 상용 배포 시 법무 확인 대상. EXAONE 엔트리의 유지 여부도 동일.
2. THIRD-PARTY-NOTICES 생성 시점 — 스토어 제출(EAS 자격증명 다음) 전 필수 여부 결정.
3. 백그라운드 라벨링의 `local` 타깃 지원을 버리고 rules/apple/byok만 허용할지, 아니면 Android 전용으로 둘지.
4. 데스크톱 빈 응답 공칭 메시지(`router.ts:135-137`)와 모바일 BYOK 무타임아웃 — 즉시 수리할 P1 성격인지 백로그인지.
5. 영구 벡터 인덱스(Rust 코어 sqlite 확장) 도입 시점 — BYOK 토큰 비용이 실측상 문제가 될 때.
