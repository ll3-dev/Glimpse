---
date: 2026-08-18T23:15:53+09:00
researcher: Claude Code (research_codebase)
git_commit: c58254c65c49ef81b19aeed46e223b26adf52fa1
branch: main
repository: Glimpse
topic: "프로젝트 전체 남은 작업(TODO/미완성/미정리) 및 안정화 필요 지점 전수 조사"
tags: [research, codebase, stabilization, rustra, desktop, mobile, design-system, release]
status: complete
last_updated: 2026-08-18
last_updated_by: Claude Code
---

# 리서치: 프로젝트 남은 작업 및 안정화 지점 전수 조사

**날짜**: 2026-08-18T23:15:53+09:00
**연구자**: Claude Code (research_codebase)
**Git Commit**: c58254c65c49ef81b19aeed46e223b26adf52fa1 (HEAD 기준, 이하 모든 untracked 파일 포함)
**Branch**: main
**Repository**: Glimpse

## 연구 질문

현재 프로젝트에서 무엇을 더 해야 하는지(남은 작업, TODO, 미완성 기능, 미정리 상태), 그리고 무엇을 안정화해야 하는지 전수 조사.

## 요약

품질 게이트는 전부 통과(lint ✅ / typecheck ✅ / `bun test` 482 pass, 0 fail)지만, **작업 트리에 106개 파일(+$1,623/−947)의 미커밋 변경**이 있고 그 안에 **시작 크래시를 유발할 수 있는 파일 1건**(`app/+error.tsx`)과 **빌드 자산 누락 위험**(`apps/mobile/assets/` 전체 untracked)이 포함되어 있다. 남은 작업은 크게 6개 축으로 정리된다: (1) 미커밋 변경 정리/커밋, (2) 모바일 rustra 스트리밍 전환 완성(JSI 네이티브 배선 + npm 0.1.2 범프), (3) 다운로드 파이프라인 안정화(취소/재개/체크섬 — 데스크톱·모바일 공통 결함), (4) 재현성 있는 상태 관리 버그 수정(코어 초기화 재시도 무효, 다운로드 취소 인스턴스 불일치, queue_depth 잔존 등), (5) 보안(BYOK API 키 localStorage 평문 — 데스크톱), (6) 문서 드리프트 정리(README Nitro 잔존 등). 우선순위는 아래 "아키텍처 인사이트" 뒤의 등급표 참조.

## 상세 분석

### 1. 품질 게이트 현재 상태 (기준선)

- `bun run lint` ✅ 통과 (apps/mobile expo lint)
- `bun run typecheck` ✅ 통과
- `bun test` ✅ 482 pass / 0 fail / 946 expect() — 65개 테스트 파일 (llama.rn 폴백/에러 경로 로그는 의도된 테스트 시나리오)
- Rust: bridge 크레이트 단위 테스트 존재(`packages/bridge-rust/src/events.rs` 내), desktop 통합 테스트 2종(`llm_stream_events.rs`, `rustra_dispatch.rs`) — 단 `state.rs`/`download.rs` 직접 커버리지 없음
- 스킵된 테스트 없음(it.skip/test.todo/#[ignore] 0건)

### 2. 미커밋 변경 106파일 — 성격과 위험 (태스크 #3 직접 분석 + 서브에이전트 교차)

**관심사별 구성 (5가지가 섞여 있음):**

| 관심사 | 핵심 파일 | 상태 |
|---|---|---|
| 모델 다운로드 이벤트 rustra 전환 (데스크톱) | `packages/bridge-rust/src/events.rs`(+80), `apps/desktop/src-tauri/src/download.rs`(+186) | 구현 완료, `rustra://model:download-progress`/`-done` 채널, 미커밋 |
| 모바일 스트리밍 계약 정렬 | `apps/mobile/src/features/ai/stream-events.ts`(신규), `modules/rustra-jsi/src/index.ts`(+2: `onEvent?`/`offEvent?` 타입만), `llama-service.factory.ts` | **절반만 완료** — 로컬 in-memory 허브, 네이티브 배선 없음 (아래 3 참조) |
| 디자인 시스템 도입 | `DESIGN.md`(신규), `AGENTS.md` 수정, `packages/ui` 9파일(태그 틴트 6색 토큰, `bg-white`→`bg-app-surface` 등), 모바일/데스크톱 UI 컴포넌트 수십 개 | 토큰값은 `packages/ui/styles/globals.css`와 hex 단위 정합 검증됨 |
| 모바일 에러/보안 인프라 | `ErrorBoundary.tsx`, `SuspenseFallback.tsx`, `secure-storage.ts`(expo-secure-store), `byok.store.ts` 마이그레이션, `expo-clipboard`/`expo-secure-store` 의존성 추가 | API 키 Keychain 저장 + 레거시 MMKV 평문 마이그레이션 후 제거 |
| 배포 준비 | `apps/mobile/eas.json`(untracked), `apps/mobile/assets/`(untracked), `app.json`, `bunfig.toml`(테스트 프리로드 경로 수정) | eas.json submit 섹션은 플레이스홀더 상태 |

**위험:**
- `apps/mobile/app/+error.tsx`(untracked) — **expo-router 55.0.4에서 유효하지 않은 라우트 파일명.** 설치된 패키지의 `getRoutesCore.js:509-513`가 `+` 접두 라우트에 throw하며, 서브에이전트가 실제 설치 버전으로 재현 확인(`getRoutes()`가 "Invalid route ./+error.tsx"로 throw → 라우트 파싱 단계에서 크래시). expo-router 규약은 라우트 모듈의 `ErrorBoundary` export이므로 이관하거나 삭제 필요. lint/typecheck는 이를 잡지 못함(파일이 라우트 컨벤션 위반이지 타입/문법 오류가 아니므로).
- `apps/mobile/assets/images/{icon,splash,adaptive-icon,favicon}.png` 전체 untracked — `app.json:7,12,36,48`이 참조. 커밋 누락 시 git 기반 EAS 빌드 실패.
- `eas.json` submit 섹션이 `YOUR_APPLE_ID@example.com` 등 플레이스홀더 — 빌드는 가능, 스토어 제출은 불가.

### 3. rustra 통합 잔여 작업 (태스크 #1)

**완료된 것:**
- Cargo rustra `=0.1.2` 정확 핀 (`packages/bridge-rust/Cargo.toml:18`, `apps/desktop/src-tauri/Cargo.toml:21`) — 임시 path 링크 원복 완료(c58254c)
- 데스크톱 스트리밍 + 모델 다운로드 이벤트의 rustra EventSink 전환 (`download.rs:135-141,156-157` → `events.rs` → `main.rs:50-52` `tauri_event_sink`)
- 프론트 리스너 4곳 모두 `rustra://` 채널 사용 (`local-llm-provider.ts:161`, `use-model-management.ts:80`, `desktop-llm-service.ts:277,279`)

**남은 것 (우선순위 순):**
1. **모바일 스트리밍의 실제 rustra 전환**: 현재 `stream-events.ts:24-63`은 로컬 in-memory `StreamEventHub`(subscribeEvent "시그니처 호환"일 뿐). JSI 네이티브(iOS `.mm`/Android JNI)에 `onEvent`/`EventSink` 배선이 0건. 남은 단계: (a) rustra FFI 이벤트 싱크→JS 콜백 배선, (b) npm `@rustra/*` 0.1.2 범프, (c) 로컬 허브 → 공식 `subscribeEvent` 교체. 단, `llama.rn` 토큰 콜백 → 로컬 허브 emit 연결은 완료(`llama-service.factory.ts:179-242`).
2. **npm `@rustra/*` 0.1.2 범프**: npm 레지스트리에 세 패키지 모두 0.1.2 게시 완료(`@rustra/react-native`, `@rustra/types`, `@rustra/tauri`). Glimpse는 세 패키지 모두 0.1.1 핀 상태로 Rust(`=0.1.2`)와 어긋남. 0.1.1의 `.d.ts`에 `subscribeEvent` 부재 → 모바일 전환의 선행 조건.
3. **design 문서 "남겨둔 것" 갱신**: `docs/plans/2026-08-16-rustra-integration-design.md:221-223`은 path 원복/게시를 남은 것으로 기록 중이나 이미 완료. (단, 워킹트리의 미커밋 수정에서 "출하된 것"으로 이동하는 갱신이 이미 반영된 상태로 보임 — 커밋 시 해소)
4. **이월 후 미착수 항목**: rkyvV2 fast path(2주차→3주차 이월 후 기록 없음), `contractHash` 드리프트 검증(옵트인 미사용), `nitroModuleError` 리네임(`apps/mobile/src/lib/effect-result.ts:73`), 뮤텍스 오염 트레이드오프 재평가(3주차 예정이었으나 기록 없음).
5. **사용자 수동 GUI 검증 체크리스트 3종**(데스크톱 7항목 L129-139, 모바일 6항목 L167-176, 스트리밍 3항목 L203-207) — "진행되지 않았다"고 명시, 완료 기록 없음.
6. `apps/mobile/docs/rustra-bridge-development.md:40` — "stream-events.ts와 subscribeEvent로 연결됨" 서술이 실제(로컬 허브)와 불일치.

### 4. TODO/스텁/미구현 마커 (태스크 #2 — 총 23건)

**(a) 버그 위험 4건:**
- `apps/mobile/src/components/capture/ScreenshotForm.tsx:67-82` — OCR 스텁 텍스트(`[OCR 스텁]...`)가 1초 가짜 딜레이 후 **실제 노트로 저장됨** → 데이터 오염
- `apps/desktop/src-tauri/src/llm/engine.rs:323-326` — 스텁 임베딩이 `vec![0.0; 768]` 영벡터 반환 → 유사도 무의미 (llm feature 기본 off 시)
- `apps/desktop/src-tauri/src/state.rs:122` — `let _ = error; // TODO: store error in model record` 다운로드 실패 사유 버림
- `eas.json:35-40` — submit 플레이스홀더 자격증명

**(b) 의도적 지연 14건 (주요):**
- 데스크톱 LLM이 기본 빌드에서 **스텁 엔진**으로 동작: `Cargo.toml:26-28` `default = []` → `llm` feature off → `engine.rs:250-328` 스텁(completion이 `[stub] LLM response...` 문자열 방출). 실추론은 `llm` feature 빌드 필요
- `BYOKSection.tsx:52-55`(데스크톱) — Test Connection 버튼이 "Not implemented" 토스트
- `ScreenshotStub.tsx`/`ShareStub.tsx`(모바일) — "MVP v1에서는 준비 중" 플레이스홀더 화면 2종 (capture/index.ts에서 export되나 참조 없음)
- `LLMSection.tsx:46-69`, `SettingsPanel.tsx:12`(데스크톱) — 하드코딩 `{false ? 'Available' : 'Unavailable'}`, "coming soon" 안내
- `engine.rs:88` — temperature/top-p 하드코딩(dist_default_seed)
- `GlobalModelDownloadBanner.tsx:134-137`(모바일) — "Retry logic could be added here" 주석 (배너 실패 재시도 미구현)

**(c) 무해 5건:** 낡은 `byok-provider.ts:7` TODO 주석(실제 구현 존재), DI 플레이스홀더 레이어, 폴백 스텁 provider 3종 등

**테스트 스킵 없음.** 앱 식별정보 완비(`kr.ll3.glimpse` iOS+Android, 권한 설명문 한국어, ShareExtension EAS 설정) — 빌드 가능, 제출 불가 상태.

### 5. 모바일 안정화 포인트 (태스크 #5)

**치명/높음:**
- `app/+error.tsx` 시작 크래시 (위 2 참조)
- 코어 초기화 재시도 무효: `initialize-core-client.native.ts:11,72-85` — 실패한 `initializationPromise`가 캐시된 채 재셋 없음 → 루트의 "다시 시도" 버튼(`_layout.tsx:124` → 89-99)이 캐시된 거부된 프로미스를 반환해 **실제 재초기화가 일어나지 않음**
- 다운로드 취소 인스턴스 불일치: `local-llm.download.ts:51`은 `new ModelDownloader()`로 시작하지만 `:96`은 싱글턴으로 cancel → 싱글턴의 `activeFilename`이 null이라 cancel 스킵(`model-downloader.ts:191-193`) → **취소가 실제 fetch를 중단하지 못함**
- 다운로드 중 강제 종료 시 부손 파일 완성본 취급: `model-downloader.ts:69-77`(존재만 검사), `:127-130`(존재 시 즉시 반환) — 부분 .gguf가 isReady=true로 표시되어 모델 로드 실패 유발. Range 재개/체크섬/`.part` 패턴 없음
- 스킴 불일치: `app.json:8` `"scheme": "glimpse"` vs `ShareViewController.swift:28`/AndroidManifest의 `ll3.kr` — 현재 네이티브 산출물은 동작하나 prebuild 재실행 시 공유 진입 붕괴 위험. Android SEND intent-filter 3회 중복 선언

**중간:**
- 채팅 중단 시 어시스턴트 응답 이중 저장 가능성: `abortAndSave`(`useChat.ts:116-132`)와 stopCompletion resolve 후 `generateAssistantReply`(`chatGeneration.ts:60-64`) 두 비동기 체인이 모두 저장 → 메시지 2개 가능
- BYOK 키 하이드레이션 레이스: `byok.store.ts:74-75` fire-and-forget 복원 — 콜드스타트 직후 전송 시 키 null로 거부(`executors.ts:163-171`)
- iOS 메모리 경고/백그라운드 시 모델 언로드 리스너 없음 (GGUF 상주, jetsam 리스크; `increased-memory-limit` entitlement만 존재)
- pending-share 실패 시 사용자 피드백 없음(로그만, 재시도는 됨) / `useChatAISetup.ts:95-109` try/finally에 catch 없어 unhandled rejection 가능

**양호:** SecureStore 기반 키 저장+평문 마이그레이션 완료, ErrorBoundary 루트 장착, 코어 초기화 게이팅 후 공유 처리, llama.rn 폴백 체인(3단), 진행률 UI 이중(카드+배너), AI 설정 다이얼로그 흐름.

### 6. 데스크톱 안정화 포인트 (태스크 #6)

**높음:**
- 다운로드 취소/재개/체크섬 전무 + `model:download-failed` 이벤트 부재: `download.rs`에 cancel/abort/Range/hash 코드 0건. 항상 truncate 재시작(`download.rs:101`), 진행 이벤트 쓰로틀링 없음(청크마다 emit, 수 GB GGUF에서 이벤트 폭주)
- `commands.rs:22-50` 중복/동시 다운로드 가드 없음 — `mark_model_downloading`(state.rs:101-112)이 상태 확인 없이 덮어씀. `delete_model`은 다운로드 중 레코드 삭제 허용(다운로드는 계속, tmp 방치)
- 상태 오염 버그 2건: (1) `state.rs:240,263` — `run_completion`/`run_completion_stream` 조기 반환 시 `health.queue_depth = 1` 영구 잔존(정상 경로만 0 복원). (2) `state.rs:159-178` — `load_model`이 engine 로드 **이전에** status="active" 설정, 실패 시 롤백 없음
- BYOK API 키가 webview localStorage 평문: `settings-storage.ts:34,48` — tauri plugin-store도 keyring도 아님. (모바일은 SecureStore로 완료 — 데스크톱만 미적용)

**중간:**
- 진행 맵 완료/실패 후 잔존: `use-model-management.ts:74-95` — `download-done`/실패 시 항목 제거 없음 → 실패한 다운로드 카드가 마지막 퍼센트에 갇힘. 모든 뮤테이션에 `onError` 없음
- `useDownloadProgress` unlisten 레이스(`use-model-management.ts:85-92`), `commands.rs:18-20,107-108` `.expect("lock poisoned")` 패닉(Err 전파 패턴과 불일치)
- 라벨링 `Promise.all`(`run-foreground-labeling.ts:24`) 부분 완료 유실 — 한 아이템 실패 시 전체 reject, per-item `labelError` 기록 없음, 취소 토큰 없음
- 셋다운 정리 전무: `main.rs`에 exit 핸들러 없음 — 진행 중 다운로드/추론과 함께 프로세스 종료. 시작 시 stale `.gguf.tmp` 정리 없음
- 모델 레지스트리 3중 중복: Rust `models.rs:118-369`(17개) vs TS `desktop-llm-service.ts:142-203`(4개, ministral 누락 불일치) vs shared `LOCAL_MODEL_REGISTRY` — 강제 동기 장치 없음
- `llama-cpp-2`가 git `branch = "main"` 미고정(`Cargo.toml:15`) — 재현성 리스크

**UI:** ReviewDeck 가장 취약(에러 분기 없음, 뮤테이션 `onError` 없이 카드 진행 → DB 실패해도 검토 완료로 오인), ChatView 에러 시 부분 스트리밍 폐기·취소 버튼 없음, CaptureModal 진행 중 백드롭 닫힘(입력 유실). ErrorBoundary 루트 1곳뿐.

**BYOK 라우팅:** 스트리밍 오류 `catch { return null; }` 삼킴(`byok-provider.ts:394-396`), HTTP 상태 무차별 `AI_PROVIDER_INVALID_RESPONSE`(401/429 구분 없음), provider 타입 불일치(`settings-storage.ts:7` 3종 vs `byok-provider.ts:19` 5종 — anthropic/google은 구현됐으나 설정 UI 도달 불가).

### 7. 문서/미정리 상태 (태스크 #7)

- **README.md Nitro 잔존** (가장 뚜렷한 드리프트): L3 "typed Nitro bridge", L56 mermaid `FFI (Nitro)`, L70 스택, L119-120 `cpp/`·`nitrogen/generated/` — **두 디렉토리 모두 실제 부재 확인**, L260 "typed Nitro bridge". 워크스페이스 구성(L31-37)/mermaid에 `packages/bridge-rust` 누락
- `docs/ui-style-guide.md` — DESIGN.md와 상당 중복 + 타이포그래피 규격 상충(Section Header `text-sm uppercase` vs DESIGN.md 18-20px semibold) + `global.css` 파일명/경로 불일치. DESIGN.md로 통합 시 갱신/삭제 필요
- AGENTS.md `src/ui` 서술이 실제(`packages/ui`)와 어긋남 — 미커밋 수정이 "src/ui (and packages/ui)"로 보완 중
- thoughts/plans·research(2026-03산) 전반이 삭제된 Nitro 아키텍처 기술 — 역사 문서로 명시 필요
- `docs/plans/2026-02-16-mvp0-10min-worklog.md` "Status: In Progress" 라벨 방치
- 글로벌 에러 로거가 콘솔 로깅만 — 크래시 리포트 서비스(Sentry 등) 없음

## 코드 참조

- `apps/mobile/app/+error.tsx` — expo-router 55 무효 라우트, 시작 크래시 요인 (untracked)
- `apps/mobile/src/features/core/initialize-core-client.native.ts:11,72-85` — 거부된 프로미스 캐시로 재시도 무효
- `apps/mobile/src/features/settings/local-llm.download.ts:51,96` — 다운로더 인스턴스 불일치로 취소 무효
- `apps/mobile/src/features/ai/model-manager/model-downloader.ts:69-77,127-130,162-164,191-193` — 부분 파일 완성본 취급, 취소 스킵
- `apps/desktop/src-tauri/src/download.rs:57,101,111-141,135-141,156-157` — rustra 이벤트 전환(완료), truncate 재시작, 무쓰로틀 emit
- `apps/desktop/src-tauri/src/state.rs:122,159-178,240,263` — 에러 버림, status 선행 설정, queue_depth 잔존
- `apps/desktop/src/lib/settings-storage.ts:34,48` — API 키 localStorage 평문
- `apps/mobile/src/features/ai/stream-events.ts:24-63,90` — 로컬 허브(subscribeEvent 시그니처 호환만)
- `apps/mobile/modules/rustra-jsi/src/index.ts:16-17` — `onEvent?/offEvent?` 타입만 선언, 네이티브 구현 없음
- `packages/bridge-rust/src/events.rs:26-32` — 이벤트 4종 채널 계약
- `apps/mobile/src/components/capture/ScreenshotForm.tsx:67-82` — OCR 스텁 텍스트 실제 저장
- `apps/desktop/src-tauri/src/llm/engine.rs:250-328` — 기본 빌드 스텁 엔진

## 아키텍처 인사이트

- **품질 게이트의 사각지대**: lint/typecheck/test가 전부 통과해도 라우트 컨벤션 위반(`+error.tsx`), 인스턴스 불일치(다운로더 취소), 프로미스 캐시(코어 재시도) 같은 런타임 결함은 잡히지 않는다. 남은 결함 대부분이 "에러 경로/수명주기"에 몰려 있음 — happy path 중심 개발의 전형적 패턴.
- **이벤트 계약과 전달 경로의 분리**: rustra 통합은 "계약 정렬"(채널명/페이로드)을 먼저 확정하고 전달 경로(데스크톱 EventSink vs 모바일 로컬 허브)를 단계적으로 전환하는 전략. 모바일은 계약만 정렬된 상태로, 이는 의도된 중간 상태이나 문서(`rustra-bridge-development.md:40`)가 완료처럼 서술하고 있어 혼동 위험.
- **플랫폼 간 보안 격차**: 모바일은 SecureStore 마이그레이션을 완료했으나 데스크톱은 localStorage 평문 — 동일 기능(BYOK)의 보안 수준이 플랫폼마다 다름.
- **레지스트리 3중 중복**(Rust/TS/shared)은 "synced" 주석만 있고 강제 장치가 없어 이미 불일치(ministral 누락) 발생 — 단일 소스(shared)로의 역수렴이 필요.

## 우선순위 등급표 (종합)

**P0 — 지금 깨지거나 곧 깨짐:**
1. `app/+error.tsx` 처리 (시작 크래시; 삭제 또는 ErrorBoundary export로 이관)
2. 106파일 미커밋 변경 정리 — 특히 `assets/`(빌드 자산), `DESIGN.md`, eas.json, download-events/stream-events 코드. 관심사별로 분리 커밋 권장
3. 코어 초기화 재시도 무효 버그 (프라미스 캐시 해제)
4. 다운로드 취소 인스턴스 불일치 (모바일)

**P1 — 데이터/상태 무결성:**
5. 다운로드 부손 파일 완성본 취급 (모바일) + 취소/재개/체크섬/실패 이벤트 (데스크톱) — `.part` 패턴 + 크기 검증
6. OCR 스텁 텍스트 노트 저장 차단
7. queue_depth 잔존 + load_model status 롤백 (데스크톱 state.rs)
8. 채팅 중단 이중 저장 레이스 (모바일)
9. ReviewDeck 에러 무시 (데스크톱) — DB 실패 시 카드 진행 차단
10. 진행 맵 잔존 + 뮤테이션 onError (데스크톱 모델 관리 UI)

**P2 — 보안/배포:**
11. 데스크톱 BYOK 키 localStorage → keyring/plugin-store
12. 스킴 불일치(glimpse vs ll3.kr) 통일 + Android manifest SEND 중복 제거
13. eas.json submit 자격증명 (출시 시점에)
14. Sentry류 크래시 리포트 연결 여부 결정

**P3 — 완성도/정리:**
15. 모바일 rustra 스트리밄 전환 완료 (JSI 네이티브 배선 + npm 0.1.2 범프 + 공식 subscribeEvent 교체)
16. README Nitro 잔존 정리 + ui-style-guide.md DESIGN.md로 통합
17. 모델 레지스트리 3중 중복 단일화
18. rustra 이월 항목(rkyvV2 fast path, contractHash, nitroModuleError 리네임, 뮤텍스 재평가)
19. GUI 수동 검증 체크리스트 3종 실행
20. 낡은 TODO 주석/무효 export 정리, 라벨링 allSettled 전환

## 히스토리 컨텍스트 (thoughts/ 디렉토리)

- `thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md` — 제품 비전/로드맵, "열린 질문"(L81-: 로컬 LLM 모델 선정, 추천 UX 형태, OCR 로컬 처리 한계, 멀티 디바이스 싱크 전략 등)
- `thoughts/shared/plans/2026-03-25_packages-core-rust-integration.md` 외 4건 — 2026-03산 Nitro/cbindgen 아키텍처 계획. rustra 통합(2026-08) 이전 아키텍처로 **현재 무효**. "다음 단계" 섹션들도 무효(예: L696 "Phase 2: Nitro Modules 통합")
- `thoughts/shared/research/2026-03-28_share-intent-research.md` 외 2건 — 공유 확장/코어 분석 역사 문서
- thoughts/에 회고/워크로그 없음 — 실질 회고는 `docs/plans/2026-08-16-rustra-integration-design.md`의 주차별 결과 섹션

## 관련 리서치

- `thoughts/shared/research/2026-03-25_core-rust-analysis.md` (있는 경우) — 코어 아키텍처 역사 참조
- `docs/plans/2026-08-16-rustra-integration-design.md` — 1-4주차 결과 및 "남겨둔 것" (1차 소스)
- `docs/plans/2026-08-16-rustra-events-plan.md`, `2026-08-16-rustra-mobile-jsi-plan.md` — 이벤트/JSI 계획

## 미해결 질문

- rustra 레포 `feat/event-sink` 브랜치의 main 머지 여부 (외부 레포 — Glimpse 저장소에서 확인 불가, 사용자 확인 필요)
- `+error.tsx`를 누가/어떤 의도로 추가했는지 (작성 의도 파악 후 이관 vs 삭제 결정)
- 데스크톱 `llm` feature(실추론)를 언제 default로 올릴지 — 스텁 임베딩 영벡터 문제와 연동
- 출시(EAS 제출) 목표 시점 — P2 보안/자격증명 작업의 선행 여부 결정
- 추천 UX 형태/멀티 디바이스 싱크 등 제품 로드맵의 열린 질문(`thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md`)
