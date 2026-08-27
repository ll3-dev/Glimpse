---
date: 2026-08-27T00:40:00+0900
author: loopy
status: draft
type: bug-fix
priority: high
---

# 사후 감사 결함 수정 SPEC

## 문제

어제 실행된 개선 항목의 신규 코드 감사 결과, "완료"로 커밋된 핵심 기능 3개가 실제로는 동작하지 않거나 사용자 데이터를 조용히 유실한다. 가장 심각한 문제는 동기화 서버의 지문 스킵 오용으로 모바일 변경이 데스크톱에 영구 반영되지 않는데 양쪽 UI는 모두 "동기화됨"을 표시하는 것(조용한 데이터 손실)이다. 그 외 11개 P1(기능 오작동/프리즈/중복 저장)과 소액 P2가 발견되었다.

근거 리서치: `thoughts/shared/research/2026-08-27_00-24-30_post-execution-audit.md`

## 해결 목표

**현재:**
1. 동기화 서버가 클라이언트가 보낸 "데스크톱 과거 지문"을 "변화 없음" 판정에 사용해, 데스크톱 자체 변경 전까지 모바일 스냅샷을 버림
2. iOS Share Extension 이미지 direct-save가 pending 레코드 없이 파일만 복사해 앱이 절대 못 가져옴("저장 완료" 알럿은 표시)
3. 401 재페어링 분기가 메시지 정규식 불일치로 도달 불가, Host 검증이 `임의도메인:포트`를 통과시킴
4. 복습 스케줄러가 3벌(Rust 미호출·TS 미러·네이티브 폴백 하드코딩)로 갈라져 있고 데스크톱은 아예 구 2배 규칙
5. 추천 피드백 verdict가 최고(oldest)-이김, edge 파서가 사소한 노이즈에 전체 응답 폐기, 공유 파일 2곳에 원문 NUL 바이트로 git diff 무력화
6. think 요약 정규식이 구분자 없는 입력에서 O(n²)(스트리밍과 곱연산 시 수 초 프리즈), 공유 처리 부분 실패 시 매 포그라운드마다 중복 저장
7. 데스크톱 의미 검색이 TS↔Rust 계약 불일치로 한 번도 작동 안 하고, debounce 없는 키스트로크당 순차 임베딩으로 메인 스레드 프리즈

**목표:**
1. 지문 스킵 판정이 **실제 콘텐츠 비교**가 되어, 어느 한쪽이라도 바뀌었으면 병합 수행하고 내용 동일 시에만 생략
2. 이미지 direct-save가 앱이 회수 가능한 pending 레코드를 남기고, 앱 처리 후 레코드·파일 정리
3. 401은 상태 코드 기반 판별로 재페어링 상태 진입, Host 허용 집합이 `.ts.net` 접미사/mDNS 광고명으로 좁혀짐
4. 복습 간격 산출이 단일 구현(`@glimpse/features` review)으로 수렴 — 데스크톱 화면·공유 훅·네이티브 폴백 모두 같은 상수와 로직 사용, 데스크톱에 기억 안 남 노출
5. verdict는 status 우선+최신 피드백 우선, edge 파서는 코드펜스/트레일링 콤마/prose 노이즈를 견디고 실패 시 로그 남김, NUL은 이스케이프로 교체
6. 요약 파싱이 입력 길이와 무관한 상수 시간(hard cut), 공유 배치는 부분 성공을 추적해 재실행 시 저장된 것 재저장 안 함
7. 임베딩 호출이 Rust 계약과 일치하고 실패 1회 로그, 훅에 debounce+상한 적용, command가 async로 메인 스레드 비점유, 캐시 키에 모델 id 포함

## 성공 기준

- [ ] 동기화: "양방향 완료 후 모바일에서만 10개 생성 → 강제 SYNC" 시 데스크톱 DB에 10개가 나타난다(지문 스킵 회귀 테스트로 고정). 내용 완전 동일 스냅샷 재전송 시 병합 생략 유지
- [ ] 401 시뮬레이션(서버 401 한국어 message 응답) 시 클라이언트가 invalidated(재페어링 필요) 상태로 전이한다 — 정규식 대신 상태 코드 판별 테스트 통과
- [ ] `bun test`(모바일+패키지)와 `cargo test --lib`(core-rust review 제거분 반영) 전부 green, `bun run lint` 통과
- [ ] 공유 배치: text 저장 성공+webUrl 1개 실패 시나리오 재현 테스트에서 재실행 시 이미 저장된 text가 중복 생성되지 않는다
- [ ] think 요약: 구분자 없는 60k자 reasoning 파싱이 스트리밍 청크 단위 기준 <50ms (기존 실측 2.5초→)
- [ ] 복습: 모바일·데스크톱·폴백이 동일 입력(feedback history)에 동일 nextReviewAt/stability/difficulty 산출 — 크로스 경계 동등성 테스트 추가. 데스크톱 화면에 remembered/forgotten/postpone 액션이 공유 스케줄러로 연결됨
- [ ] 추천: accept→dismiss 히스토리에서 rejectedPairs 차단 및 페널티가 올바르게 계산됨(중복 이벤트 시나리오 테스트). prose 대괄호/트레일링 콤마 샘플이 파서에서 유효 엣지로 생존
- [ ] 검색: `invoke('run_embedding')` 페이로드가 Rust 구조체 역직렬화를 통과하며({runtimeId,modelId,input}), 통합 테스트 또는 타입 수준 계약 고정 테스트 존재. 검색 입력이 debounce(≥250ms)되고 임베딩 대상이 상한(≤30개) 이하

## 범위 제한

- **하지 않는 것**: 델타 동기화 프로토콜 전환, 매분 전체 재작성 구조 변경, 코어 전역 락 해소, tailscale 블로킹 추가 제거 — 별도 스펙
- **하지 않는 것**: llama.cpp 임베딩 컨텍스트 재사용 리팩터(engine.rs 깊은 수술) — debounce+상한으로 증상 완화 후 별도 스펙
- **하지 않는 것**: 모바일 semantic 검색 연결, OCR/이미지 파이프라인 전환(legacy→media DB), CI E2E·tauri build 게이트, 거절 페널티 시간 창/감쇠(제품 결정 필요) — 별도 스펙
- Rust `calculate_next_review` 데드 명령은 **삭제**(브릿지 regen 포함)하고 TS 공유 구현을 단일 출처로 확정 — 파리티 골든테스트 양방향 유지는 불필요(단일 구현이 되므로)
- 라벨 finance '재무'→'금융' 표기 변경은 되돌리지 않음(의도된 수렴, 커밋 메시지로 문서화)
- iOS Swift 변경은 기존 App Group/UserDefaults 방식 안에서 최소 수정(SwiftUI 재구조화 등 금지). xcodebuild 빌드 검증이 환경상 불가하면 문법 수준 신중 변경+TS 측 테스트로 대체하고 커밋에 명시
- 기존 테스트·코드 스타일 준수(desktop eslint 10 유지, bun.lock 임의 변경 금지)

## 참고 자료

### 근거 리서치 (모든 위치·증거·실패 시나리오는 여기에)

- `thoughts/shared/research/2026-08-27_00-24-30_post-execution-audit.md` — 도메인별 P0/P1/P2 상세

### 수정 대상 코드 (커밋 09caa5b 기준)

- 동기화: `apps/desktop/src-tauri/src/sync/server.rs:145-146,206-217,225-238`, `apps/mobile/src/features/sync/sync-url.ts:32-34`, `sync-client.ts:138-163,228-249`, `background-task.ts:28-30`
- 공유/iOS: `apps/mobile/src/features/share/process-share-data.ts:54-79`, `pending-share-processor.ts`, `apps/mobile/ios/ShareExtension/ShareViewController.swift:322-337,498-523`, `apps/mobile/ios/glimpse/AppGroupModule.swift:36-49`
- Chat: `packages/features/src/chat/index.ts:221-259` (summarizeReasoning), 소비자 `ChatStreamingMessage.tsx:11`
- 복습: `apps/desktop/src/app/_authenticated/review.tsx:6-36`, `packages/hooks/src/mutations/useReviewMutations.ts:10-37`, `packages/features/src/review/{actions.ts,adjustIntervalFromFeedback.ts}`, `apps/mobile/src/features/core/native-core-fallback-client.ts:15,105-123`, 삭제 대상 `packages/core-rust/src/core_client/review.rs`(calculate_next_review) + `packages/bridge-rust/src/io/review.rs` + generated 3종, `ReviewItemCard.tsx:151`(색상 토큰)
- 추천: `packages/features/src/recommendation/{index.ts:71-77,98-130,140, edge-parser.ts}`, `proposeEdgesWithAI.ts:36-48`, `refreshRecommendations.ts`, `useKnowledgeGraphAutomation.ts:48-61`
- 검색/인프라: `apps/desktop/src/features/local-llm/desktop-llm-service.ts:63-72,239`, `src-tauri/src/models.rs:67-80`, `commands.rs:113-120`(sync→async), `useSemanticRerank.ts:37-101`, `SearchBar.tsx`, `src/types/glimpse-desktop-bridge.d.ts`(삭제된 @glimpse/core 참조), 루트 `package.json:37`(lint 스크립트 양앱 연쇄)
- 컨벤션: `DESIGN.md`(색상 토큰), `CLAUDE.md`(검증 게이트), bridge regen: `bun run bridge:generate`
