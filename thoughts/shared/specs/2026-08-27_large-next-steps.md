---
date: 2026-08-27T13:20:00+0900
author: loopy
status: draft
type: feature
priority: high
---

# 대형 후속 과제(선별) SPEC

## 문제

사후 감사 수정(`5556c65`)으로 급한 결함은 정리됐지만, 그 과정에서 범위 제한으로 남겨진 구조적 병목 3종이 여전히 사용자 경험과 운영을 갉아먹는다:

1. **데스크톱 의미 검색이 검색 결과마다 임베딩을 개별 IPC로 호출** — `useSemanticRerank`가 최대 30개 항목을 순차 `run_embedding`(항목당 컨텍스트 신규 생성)으로 돌려, debounce와 상한으로 완화된 상태여도 첫 재정렬 체감 지연의 근본 원인이 남는다.
2. **모바일에는 의미 검색이 아예 없다** — 데스크톱에만 semantic 재정렬이 있고, 공유 로직(rankBySemanticSimilarity/useSemanticRerank)은 데스크톱 전용 위치에 묶여 있다.
3. **CI 파이프라인이 8/19 이후 완전 그린이 0회** — unused import 컴파일 에러, clippy `-D warnings` 누적, expo-modules-core×Xcode 호환 붕괴(iOS 잡)가 겹쳐 있어 어떤 PR도 건강한 신호를 주지 못하고, 네이티브 릴리스 잡 2개가 매 PR 33분씩 자주 안 바뀌는 영역에 과금된다.

근거 리서치: `thoughts/shared/research/2026-08-27_13-07-25_large-next-steps.md`

## 해결 목표

**현재:**
1. `engine.rs`의 `embedding()`이 호출마다 새 `LlamaContext` 생성(tokenize→decode→embeddings_seq_ith), TS가 항목별 개별 invoke. runtime_service에는 배치 경로 없음.
2. `useSemanticRerank.ts`가 `apps/desktop/src/features/search/`에 있고 embed 함수를 하드코딩 의존 — 모바일에서 재사용 불가. 모바일 BYOK(openai-compatible) 설정·API 클라이언트에는 embedding 배치 경로 없음(Anthropic은 embedding API 부재 → provider 능력 분기 필요).
3. `.github/workflows/ci.yml` 4잡(js/rust/android-release/ios-release): rust 잡 레드(unused import + clippy), ios-release 레드(expo SDK × Xcode 드리프트), CI bun-version 1.3.6 vs packageManager 1.4.0 드리프트, audit high 32건 transitive로 게이트화 불가, tauri build 번들 단계 무검증.

**목표:**
1. `run_embedding_batch(input: string[])` Rust 명령 — 엔진 레벨 배치(clear_kv_cache 루프, llama-cpp-2 공식 임베딩 패턴), async+spawn_blocking. 데스크톱 service·useSemanticRerank가 한 번의 invoke로 전체 재정렬 입력 처리.
2. useSemanticRerank를 embed-fn 주입형 훅으로 packages/hooks 승격 — 데스크톱(Tauri bridge)과 모바일(BYOK embedding API)이 같은 재정렬 로직 공유. 모바일은 옵트인 설정+프라이버시 명시 후 openai-compatible `/embeddings` 배열 배치 사용(Anthropic 선택 시 비활성 안내).
3. CI를 다시 그린으로: (a) 컴파일 에러/clippy 백로그 해소, (b) bun-version 드리프트 제거, (c) iOS 잡은 Xcode pin 수리 후 주간 cron+path filter 격리, Android도 path filter 적용, (d) rust job 말미에 `tauri build --debug --no-bundle --bundles deb` 검증 스텝 추가(+1–3m), (e) audit high는 주간 cron non-blocking job.

## 성공 기준

- [ ] `run_embedding_batch`: 빈 배열/단건/30건 입력에서 {vector}[] 반환 계약 테스트(TS↔Rust payload/response 파서) 통과. 미로드 시 명확한 에러 문자열. 기존 `run_embedding` 단건 유지
- [ ] useSemanticRerank(deps 주입형) 이동 후 데스크톱 library 화면 회귀 없음(기존 캐시/debounce/상한 테스트 green 유지), 배치 전환 후 임베딩 invoke 횟수가 N개 항목 → 1회임을 확인하는 테스트 추가
- [ ] 모바일: 옵트인 ON+openai-compatible 키 설정 시 검색 결과에 semantic 점수 반영, Anthropic/provider 미지원 또는 OFF일 때 기존 동작 유지. provider 능력 판정·배치 요청 파싱 단위 테스트 통과
- [ ] CI: main push에서 js/rust 잡 그린(android/ios는 스케줄·경로 조건). `tauri build --debug --no-bundle` 스텝이 rust 잡에서 통과
- [ ] `bun test`, `bun run lint`, `bun run typecheck`, `desktop:rust:check`, cargo 테스트(core-rust/src-tauri) 전부 green

## 범위 제한

- **하지 않는 것**: 델타 동기화 프로토콜(watermark/HLC) — 리서치 결론대로 미룰 가치 > 할 가치. 트리거(중앙값 페이로드 1–2MB 초과) 관찰 후 별도 스펙. 단, 값싼 최적화 3종(zstd 압축 등)도 이번 라운드 제외 — 브릿지 와이어 변경 리서치가 선행 필요
- **하지 않는 것**: llama.cpp 상시 임베딩 컨텍스트(LlamaContext !Send로 비권장 확정), 디스크 임베딩 캐시(stale 위험 대비 이득 낮음)
- **하지 않는 것**: 모바일 온디바이스 임베딩(nomic 모델 profile) — 차후 옵션으로만 기록, BYOK-first
- **하지 않는 것**: `@wdio/tauri-service` macOS E2E — 실사용 플로우 확정 후 별도 스펙. 이번 라운드 P3(Playwright 스모크)도 CI 노이즈 관리 우선순위에서 제외(파이프라인 정상화가 먼저)
- **하지 않는 것**: 거절 페널티 시간 창/감쇠(제품 결정 보류 유지)
- iOS 수리는 기존 workflow 파일 내 Xcode pin(`xcode-select`) 수준으로 제한 — 워크플로 재설계/expo 업그레이드 금지. pin 실패 시 주간 cron 전환+수동 체크리스트 문서화로 대체
- audit 게이트는 main 레인 금지(schedule 전용 non-blocking). known-advisory 허용 목록 도입도 별도로 하지 않음(노이즈 관리는 cron 분리로 충분)
- 기존 테스트·스타일 준수(desktop eslint 규칙 변경 금지, bun.lock 임의 변경 금지)

## 참고 자료

### 근거 리서치

- `thoughts/shared/research/2026-08-27_13-07-25_large-next-steps.md` — 4종 현황·옵션·공수·실측

### 코드 참조 (커밋 5556c65 기준)

- 임베딩 엔진: `apps/desktop/src-tauri/src/llm/engine.rs:248`(embedding per-call ctx 생성), state.rs:411, services/runtime_service.rs:42(run_embedding_blocking), commands.rs:117(run_embedding), main.rs:73
- 데스크톱 소비: `apps/desktop/src/features/local-llm/desktop-llm-service.ts:288-291`(runEmbedding invoke), `apps/desktop/src/features/search/useSemanticRerank.ts`, 사용처 `app/_authenticated/library/index.tsx`
- 모바일 BYOK: `apps/mobile/src/features/settings/` 내 openai-compatible 설정(구현 시 codebase-analyzer로 현 위치 확정)
- CI: `.github/workflows/ci.yml`(js/rust/android-release/ios-release; bun-version: 1.3.6, dtolnay/rust-toolchain, Swatinem/rust-cache)
- 패턴 선례: run_embedding async+spawn_blocking(commands.rs:117-124), bridge regen `bun run bridge:generate`
