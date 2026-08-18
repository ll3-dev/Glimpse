---
date: 2026-08-19
author: loopy-lim (Claude Code 워크플로)
status: draft
type: bug-fix
priority: high
research: thoughts/shared/research/2026-08-19_00-37-04_remaining-work-stabilization-audit.md
---

# Glimpse 안정화 라운드 2 SPEC

## 문제

2026-08-19 전수 조사에서 안정화 프로그램(라운드 1) 이후에도 (1) 모바일 BYOK 키 복원이 비동기 fire-and-forget이라 콜드스타트 직후 채팅이 실제 키가 있음에도 거부되고, (2) 데스크톱 모델 다운로드에 취소·재개·체크섬이 전무해 수 GB GGUF의 부분 파일이 완성본으로 취급될 수 있으며, (3) 데스크톱 기본 빌드의 스텁 LLM 엔진이 에러가 아닌 성공 응답(`[stub]` 문자열, 768차원 영벡터 임베딩)을 반환해 데이터를 조용히 오염시키는 경로가 확인되었다. 여기에 UTF-8 문자 경계 panic, 무시되는 추론 파라미터(temperature/top_p/n_ctx), 평문 키 잔존, UI 연타·에러 무음 등 에러 경로·수명주기 결함이 함께 남아 있다.

## 해결 목표

**현재:** BYOK 키는 SecureStore에서 비동기 복원되지만 완료를 기다리는 게이트가 없어(복원 실패도 silent) 초기화 직후 전송이 거부된다. 데스크톱 다운로드는 취소 불가·항상 처음부터·수신 바이트 검증 없이 rename된다. `llm` feature가 기본 off인데 활성화 지점이 어디에도 없어 배포 빌드는 항상 스텁 엔진이고, 스텁은 `Ok`를 반환해 소비자가 구분할 수 없다. engine은 temperature/top_p/n_ctx를 무시하고 한국어 프롬프트에서 panic할 수 있다. 마이그레이션 후에도 평문 API 키가 레거시 localStorage 키 아래 잔존한다. 리뷰 카드 연타가 DB 이중 기록하고, 모델 관리 뮤테이션 실패가 UI에 무음이며, 종료 시 정리 핸들러가 없다.

**목표:** (1) BYOK 키 복원이 초기화 게이트에 편입되어 하이드레이션 완료(또는 실패 로그) 전에는 채팅이 거부되지 않고, (2) 데스크톱 다운로드가 취소 가능·재개 가능·크기 검증되어 어떤 시나리오에서도 부분 파일이 `ready`가 되지 않으며, (3) 스텁 엔진이 성공 대신 명시적 에러를 반환하고 `llm` feature 활성화 방침(빌드 스크립트)이 확정되어 스텁 텍스트·영벡터가 데이터로 저장되는 경로가 차단된다. 추론 파라미터가 실제 엔진에 전달되고, 레거시 평문 키가 삭제되며, 리뷰 연타·뮤테이션 실패·종료 경로가 사용자에게 표시되거나 안전하게 수렴한다.

## 성공 기준

- [ ] 모바일: 하이드레이션 완료 전 채팅 전송 시나리오에서 거부 대신 복원 완료 후 정상 실행됨을 테스트가 검증(또는 복원 실패가 로깅되고 사용자 안내됨)하고, 데스크톱: 다운로드 취소/중단/크기 불일치 시나리오 각각에서 tmp 정리 + 실패 이벤트 + 상태 복원이 일어남을 Rust 테스트가 검증한다
- [ ] 스텁 엔진의 completion/embedding이 `Err`를 반환함을 테스트가 검증하고, `llm` feature 활성화(예: `tauri:build`에 `--features llm`)가 스크립트/문서에 명시되며, `temperature`/`top_p`/`n_ctx`가 `CompletionRequest`→engine에 전달됨을 테스트가 검증한다
- [ ] `bun run lint` + `bun run typecheck` + `bun test` + `cargo test --workspace` + `cargo clippy --workspace -- -D warnings` 전부 통과하고, 레거시 localStorage 키가 마이그레이션 후 삭제됨을 테스트가 검증하며, UTF-8 안전 슬라이싱 적용 후 한국어 프롬프트 stub panic이 재현되지 않는다

## 범위 제한

**이번에 하지 않는 것:**
- `git push`·eas.json 자격증명·GUI 수동 검증 체크리스트 (사용자 액션 — 리서치 P0)
- 모바일 JSI 네이티브 이벤트 배선(`RustraJSIBridge.cpp` onEvent/offEvent) — 별도 아키텍처 후속. 단 설계 문서 서술 정정은 문서 정리에 포함
- rkyvV2 fast path, contractHash, 뮤텍스 오염 재평가(rustra 측 선행 필요)
- 데스크톱 `llm` feature를 **default로** 활성화 — 빌드 시점 활성화 방침(스크립트)만 확정. default 전환은 빌드 타임/CI 검증 후 별도 결정
- Sentry/크래시 리포트, i18n, CI 도입, OCR/하이라이트/추천 UX 등 제품 로드맵 항목
- 모바일 다운로드 파이프라인(라운드 1에서 `.part`+크기검증 완료) 재작업
- 원격 push는 하지 않는다(로컬 커밋만)
- ReviewCard 연타 가드 외의 리뷰 UX 개편, 토스트 인프라 전면 도입(최소 상태 노출 범위로 해결)

**가정:**
- 스텁 `Err` 전환 시 mock 브리지를 쓰는 기존 프론트 테스트는 영향 없음(스텁은 Rust 빌드 경로, TS 테스트는 `createStaticDesktopLLMService` mock 사용)
- 하이드레이션 게이트는 기존 코어 초기화 흐름(`initialize-core-client`)과 동일한 패턴으로 편입 가능
- `download.rs` 재개(Range)는 서버가 `Accept-Ranges`를 지원하지 않으면 처음부터 재시작으로 폴백(HF 정적 파일은 Range 지원)

## 참고 자료

- 리서치(근거 파일:줄 포함): `thoughts/shared/research/2026-08-19_00-37-04_remaining-work-stabilization-audit.md`
- 하이드레이션 레이스: `apps/mobile/src/stores/settings/byok.store.ts:32,69-75` / 소비: `apps/mobile/src/features/ai/targets/executors.ts:161-172` / 게이트 후보: `apps/mobile/src/lib/init.ts`
- 데스크톱 다운로드: `apps/desktop/src-tauri/src/download.rs:69-176,258-285`(tmp/rename/`sync_download_status`), `state.rs:104-155`(가드), `commands.rs`
- 스텁 엔진: `apps/desktop/src-tauri/src/llm/engine.rs:55,87-90,140,271-299,295,313,325-332` / feature: `apps/desktop/src-tauri/Cargo.toml:29-31` / 활성화 부재: `apps/desktop/package.json` scripts
- 파라미터 폐기: `apps/desktop/src-tauri/src/state.rs:278,334`, `models.rs:58`(CompletionRequest.temperature), 전달 프론트: `apps/desktop/src/features/ai/providers/local-llm-provider.ts:78`
- BYOK 파라미터 하드코딩: `apps/desktop/src/features/ai/providers/byok-provider.ts:51-52,84-134,397`
- 레거시 키: `apps/desktop/src/lib/settings-storage.ts:41,104`(LEGACY_SETTINGS_KEY 미삭제)
- 리뷰 연타: `apps/desktop/src/components/review/ReviewCard.tsx:91-110`, `ReviewDeck.tsx:30-46`
- 뮤테이션 onError: `apps/desktop/src/features/local-llm/use-model-management.ts:147-201`
- 셋다운: `apps/desktop/src-tauri/src/main.rs:13-76`
- loaded_model_id: `apps/desktop/src-tauri/src/state.rs:262-263,318-319`
- dead code: `apps/desktop/src/components/settings/LLMSection.tsx`, `apps/mobile/src/components/capture/ScreenshotStub.tsx`/`ShareStub.tsx`(재export `capture/index.ts:19-20`)
- 문서 드리프트: `docs/plans/2026-08-16-rustra-integration-design.md:83,103,209`, `docs/plans/2026-02-17-ai-provider-sdk-integration.md`(Draft 라벨), `2026-03-26-effect-migration.md`(라벨 부재)
- 패턴 참조(모바일 대응물): `apps/mobile/src/features/ai/model-manager/model-downloader.ts`(.part+크기검증), `apps/mobile/src/features/settings/local-llm.download.ts`(취소 싱글턴)
