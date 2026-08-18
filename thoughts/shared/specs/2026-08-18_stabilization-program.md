---
date: 2026-08-18
author: loopy-lim (Claude Code 워크플로)
status: draft
type: bug-fix
priority: high
research: thoughts/shared/research/2026-08-18_23-15-53_stabilization-backlog.md
---

# Glimpse 안정화 프로그램 SPEC

## 문제

2026-08-18 전수 조사 결과, 작업 트리에 106개 파일의 미커밋 변경이 방치되어 있고 그 안에 앱 시작 크래시 요인(`app/+error.tsx`), 빌드 자산 누락 위험(untracked `assets/`), 재시도·취소가 실제로 동작하지 않는 버그, 다운로드 부손 파일을 완성본으로 취급하는 결함, 데스크톱 API 키 평문 저장 등 사용자 데이터 무결성과 안정성을 해치는 문제가 다수 확인되었다. 품질 게이트(lint/typecheck/482 테스트)는 통과하지만 대부분의 결함이 에러 경로·수명주기에 몰려 있어 게이트가 잡지 못한다.

## 해결 목표

**현재:** 크래시 요인과 미커밋 WIP가 섞인 채 방치되어 있고, 다운로드 취소/재시도가 무효이며, 실패 경로(다운로드 실패, 라벨링 부분 완료, 리뷰 DB 실패, 코어 초기화 실패)에서 상태 오염·데이터 오염·무피드백이 발생한다. 데스크톱 BYOK 키는 webview localStorage에 평문으로 저장된다.

**목표:** 모든 알려진 결함이 수정되어 (1) 앱이 어떤 입력에서도 시작 크래시 없이 부팅되고, (2) 다운로드는 취소/실패/중단 시나리오에서 정확한 상태로 수렴하며, (3) 실패 경로마다 상태가 오염되지 않고 사용자에게 표시되고, (4) API 키가 OS 키체인에 저장되며, (5) 전체 변경이 관심사별 커밋으로 정리되고 게이트(lint/typecheck/test/cargo test/clippy)가 통과한다.

## 성공 기준

- [ ] `app/` 디렉토리에 expo-router 55 무효 라우트(`+` 접두, `+not-found`/`+api`/`+html`/`+middleware`/`+native-intent` 제외)가 없고, `bun test`에 라우트 파일 규약 검증이 포함됨 (회귀 방지)
- [ ] 코어 초기화 실패 후 "다시 시도"가 실제 재초기화를 수행함(거부된 프로미스 재캐시 없음)을 테스트가 검증
- [ ] 다운로드 전 경로(모바일·데스크톱)에서: 취소가 실제 다운로드를 중단, 부분 파일이 완성본으로 취급되지 않음(`.part` 패턴+크기 검증), 실패가 이벤트/스토어로 사용자에게 표시됨을 각 플랫폼 테스트가 검증
- [ ] `bun run lint` + `bun run typecheck` + `bun test`(기존 482 전부 포함, 신규 회귀 테스트 추가) + `cargo test`(src-tauri, bridge-rust) + `cargo clippy` 전부 통과
- [ ] 작업 트리가 정리됨: 기존 WIP + 본 수정이 단일 목적별 커밋으로 분리되고 `git status`가 클린함 (push는 하지 않음)

## 범위 제한

**이번에 하지 않는 것 (사용자 액션 / 외부 의존 / 후속 결정):**
- eas.json submit 실자격증명 입력(Apple/Google 계정 필요) — 플레이스홀더 유지
- Sentry 등 크래시 리포트 서비스 도입 결정·연결
- GUI 수동 검증 체크리스트 3종 실행(사용자 디바이스 작업)
- rustra 외부 레포(`~/dev/ll3/rustra-bridge`)의 브랜치 머지 상태 확인·조작
- 모바일 JSI 네이티브(iOS .mm/Android JNI) 이벤트 배선 — 설계 문서가 로컬 허브(`stream-events.ts`)를 출하된 방식으로 결정했으므로 후속 후보로 유지. 이번엔 npm `@rustra/*` 0.1.2 버전 정렬만 수행
- rkyvV2 fast path, contractHash 드리프트 검증(rustra 측 선행 작업 필요)
- i18n 프레임워크 도입, 추천 UX/멀티 디바이스 싱크 등 제품 로드맵 열린 질문
- 데스크톱 `llm` feature 기본 활성화(llama-cpp-2 실추론 빌드 전환)
- placeholder 화면(ScreenshotStub/ShareStub) 제거 — 의도된 MVP 안내 UX이므로 유지

**가정:**
- 기존 106파일 WIP는 coherent한 완성 작업이다(lint/typecheck/482 테스트 통과, 설계 문서가 출하로 갱신됨) — 검증 후 관심사별 커밋으로 정리한다
- 딥링크 스킴은 네이티브 전체(공유 확장·매니페스트)가 `ll3.kr`를 사용하므로 `app.json`을 `ll3.kr`로 맞춘다
- 원격 push는 하지 않는다(커밋만)

## 참고 자료

- 리서치(근거 파일:줄 포함): `thoughts/shared/research/2026-08-18_23-15-53_stabilization-backlog.md`
- 무효 라우트: `apps/mobile/app/+error.tsx` (expo-router 55 `getRoutesCore.js` throw, 재현 확인됨)
- 코어 재시도: `apps/mobile/src/features/core/initialize-core-client.native.ts:11,72-85`
- 다운로드(모바일): `apps/mobile/src/features/settings/local-llm.download.ts:51,96` / `src/features/ai/model-manager/model-downloader.ts:69-77,127-130,191-193`
- 다운로드(데스크톱): `apps/desktop/src-tauri/src/download.rs`, `commands.rs:22-70`, `state.rs:101-138`
- 상태 오염: `apps/desktop/src-tauri/src/state.rs:122,159-178,240,263`
- 채팅 레이스: `apps/mobile/src/hooks/chat/useChat.ts:116-132`, `chatGeneration.ts:60-64`
- 리뷰 에러: `apps/desktop/src/features/review/` (`review.tsx:20-70`, `ReviewDeck.tsx:27-43`)
- 진행 맵: `apps/desktop/src/features/local-llm/use-model-management.ts:74-95`
- 키 평문: `apps/desktop/src/lib/settings-storage.ts:34,48` (모바일 대비: `apps/mobile/src/lib/secure-storage.ts`)
- 라벨링: `apps/desktop/src/features/labeling/run-foreground-labeling.ts:24,36`
- 스킴: `apps/mobile/app.json:8` vs `ios/ShareExtension/ShareViewController.swift:28`, `android/app/src/main/AndroidManifest.xml`
- BYOK: `apps/desktop/src/features/ai/providers/byok-provider.ts:249-255,394-396`, `settings-storage.ts:7`
- 문서: `README.md`(Nitro 잔존), `docs/ui-style-guide.md` vs `DESIGN.md`, `docs/plans/2026-08-16-rustra-integration-design.md:221-223`, `apps/mobile/docs/rustra-bridge-development.md:40`
- 레지스트리: `packages/shared/src/index.ts`(getDesktopModels 기존) vs `apps/desktop/src/features/local-llm/desktop-llm-service.ts:142-203`

## 워크스트림 구성 (구현 계획의 골격)

- **A. P0 크래시·커밋 정리**: +error.tsx 이관/삭제 + 라우트 규약 테스트, 코어 재시도 수정, 다운로드 취소 인스턴스 일치화, WIP 관심사별 커밋
- **B. 다운로드 무결성**: 모바일 `.part`+크기 검증+배너 재시도, 데스크톱 `download-failed` 이벤트+쓰로틀+동시성/삭제 가드+시작 시 stale tmp 정리+실패 사유 저장
- **C. 상태·레이스**: queue_depth 복원, load_model 롤백, 채팅 이중 저장 가드, ReviewDeck 에러 처리, 진행 맵 정리+onError, unlisten 레이스, labeling allSettled+labelError, commands.rs `.expect`→Result
- **D. 보안·설정**: 데스크톱 키 OS 키체인(keyring crate), 스킴 `ll3.kr` 통일+SEND 필터 중복 제거, BYOK 에러 매핑(401/429)+provider 타입 정합, 설정 파싱 시 키 보존
- **E. 완성도**: npm `@rustra/*` 0.1.2 범프, `nitroModuleError` 리네임, 낡은 TODO 정리, CaptureModal 백드롭 가드, useChatAISetup catch, pending-share 실패 피드백, llama-cpp-2 rev 고정, TS 모델 레지스트리 shared 단일화
- **F. 문서 정리**: README Nitro 제거+bridge-rust 반영, ui-style-guide↔DESIGN.md 정합, rustra 설계문서 "남겨둔 것" 갱신+뮤텍스 재평가 노트, rustra-bridge-development.md 정정, worklog 상태 라벨
