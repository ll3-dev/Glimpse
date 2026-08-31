---
date: 2026-08-30T22:49:26+09:00
researcher: Claude
git_commit: 3928e06e2f708c017bb2233686b4dbfcd3116dd1
branch: main
repository: Glimpse
topic: "전체 일관성 감사 — UI/디자인·기능/동작·코드 정합성·문서 vs 코드"
tags: [research, codebase, audit, design-system, bridge, query-keys, dead-code, docs-drift]
status: complete
last_updated: 2026-08-30
last_updated_by: Claude
---

# 리서치: 전체 일관성 감사

**날짜**: 2026-08-30 22:49 (KST)
**연구자**: Claude
**Git Commit**: 3928e06 (main = origin/main 동기)
**Branch**: main
**Repository**: Glimpse

## 연구 질문
"너무 안 맞아져 있는 부분이 많다" — UI/디자인(DESIGN.md 대비), 기능/동작, 코드 정합성(타입·쿼리키·브리지), 문서 vs 코드 4영역 전수 점검.

## 요약

4개 병렬 감사 에이전트 결과 종합. **와이어 계약(브리지 40 커맨드 Rust↔TS)과 엔타이틀먼트/권한 설정은 깨끗하게 정합**하나, 문제는 **사용 층과 문서 층**에 집중되어 있음.

### P0 — 사용자 노출 기능 결함
1. **공유 인텐트 프리필 체인 미연결**: iOS Share Extension/Shortcuts·Android SEND로 적립된 텍스트/URL을 화면에 채우는 유일 구현 `useCaptureFormState`가 어떤 화면에서도 소비되지 않음. `app/capture.tsx:18`은 자체 useState로 빈 폼만 띄움. `parseShareIntent`, reducer `apply_share_intent` 분기, `AppGroupModule` 리더가 전부 구현돼 있으나 마지막 배선이 빠진 "완성됐으나 미연결" 상태. (`apps/mobile/src/hooks/useCaptureFormState.ts:9`, `apps/mobile/app/capture.tsx:18`, `apps/mobile/src/components/share-intent/ShareIntentNavigator.tsx:15`)

### P1 — 실질 버그 후보 (쿼리 키 정합)
2. **recommendations 무효화 정렬이 데스크톱에만 반영**: 데스크톱은 `recommendations.all`로 그래프·전체까지 갱신(`packages/hooks/src/mutations/useRecommendationMutations.ts:20`)되나, 모바일은 respond(`apps/mobile/src/hooks/mutations/useRecommendationActions.ts:60`)·캡처 저장(`useCaptureActions.ts:58`)·삭제(`:114`)·포그라운드(`useAppForegroundRecommendations.ts:28`)가 `recommendations.pending`만 무효화 → `['recommendations']` 소비처(라이브러리 상세 `app/library/[id].tsx:47`)가 stale 잔존.
3. **데스크톱 리뷰 뮤테이션이 detail 쿼리 미갱신**: `patchKnowledgeItemInList`가 exact `['knowledgeItems']`만 setQueryData하고 `['knowledgeItems','detail',id]`(라이브: `apps/desktop/src/app/_authenticated/library/$itemId.tsx:13`)은 무효화 없음 → 상세 화면이 staleTime 5분간 구 review 필드 표시 가능. (`packages/hooks/src/mutations/useReviewMutations.ts:41-54`)
4. **`['models','available']` no-op 무효화 5곳**: `apps/desktop/src/features/local-llm/use-model-management.ts:132,147,162,178,193` — 이 키로 쓰는 useQuery가 코드베이스에 없음.

### P1 — 데드 표면 (구현됐으나 미소비)
5. **sync_plan 6개 Rust 커맨드 데드**: `endpointCandidates/normalizeBaseUrl/discoveryBaseUrl/recordSyncFailure/recordSyncSuccess/isHoldingOff` — 구현·등록(`packages/bridge-rust/src/sync_plan.rs`, `lib.rs:60`)·생성 클라이언트까지 존재하나 모바일이 동일 로직을 TS로 재구현해 사용(`sync-url.ts:9-23`, `backoff.ts:27-45`). 백오프 상수(BASE 60s/MAX 30min)가 3벌 중복(`packages/shared/src/backoff.ts:10-12`, mobile `backoff.ts:7-8`, `sync_plan.rs:111-112`).
6. **iOS dnssd Rust 백엔드 우회**: `packages/bridge-rust/src/sync_discovery/dnssd.rs`(299행)가 존재하나 iOS 앱은 Swift 네이티브 모듈(NetServiceBrowser) 경로 유지. Android만 브리지 경로(`index.android.ts:31`). **syncDiscover 타임아웃 클램프 3중 불일치**: Rust [100,5000]ms(`backend.rs:13,68`) / Android TS [500,5000](`index.android.ts:31`) / iOS [500,10000](`SyncDiscoveryModule.swift:16`).
7. **구세대 UI 잔재**: 구 캡처 폼 5종+ChannelSegment(`apps/mobile/src/components/capture/`), `LocalLLMSection.tsx`, `AppleIntelligenceSection.tsx`(로직은 생존) — 전부 임포터 0건.
8. **기타 데드**: `local-core-store.ts` 전체, `useCaptureActionsMutation` 조합기, `processPendingSharesNow`, `getCoreDbPath`, `getAppGroupContainerPathSync`(상시 null), `['models','available']`/`recommendations.weekly`/`chat.conversation(id)`/`llm.health|models|runtimes` 죽은 쿼리 키.
9. **데스크톱 업데이터 껍데기**: `tauri.conf.json:38-39` 빈 pubkey/endpoints + plugin 등록만 존재, 프런트엔드 소비 코드 없음.
10. **`llm:stream-done` 고아 emit**: 양 플랫폼 모두 소비자 없음 (데스크톱 `commands.rs:196` emit, 리스너 없음; 모바일 허브 재수출만). 모바일 네이티브 이벤트 푸시 인프라(onEvent/offEvent/drainEvents)도 프로덕션 미사용.

### P1 — 문서 vs 코드
11. **CHANGELOG 8/21 이후 완전 정지**: 이후 190커밋분 주요 기능(리마인더·양방향 델타 동기화·채팅 RAG·digest 최근 연결·iOS Shortcuts 캡처·그래프 증분 분석) 전부 미기록.
12. **명령 수 만료**: README:205·`apps/mobile/docs/rustra-bridge-development.md:21`의 "26 commands" → 실제 37개 생성 TS 커맨드(Rust `#[command]` 40개).
13. **`sync:e2e` 루트 참조 깨짐**: 플랜 문서(`2026-08-30-graph-capture-infra.md:560`)가 루트 실행 명령처럼 기술했으나 스크립트는 `apps/mobile/package.json:20`에만 존재.
14. README "lint는 모바일만" → 실제 모바일+데스크톱 모두.

### P1 — UI/디자인 (DESIGN.md 드리프트)
15. **패스텔 태그 색상 값 10개 불일치**: DESIGN.md 표(예: Mint bg `#d9f3e1`) vs 실제 토큰(`packages/ui/styles/globals.css`, Mint bg `#edf7f0` 등). 코드가 전부 토큰화돼 있어 시각적 일관성엔 문제 없으나 **문서가 구값**. 게다가 `packages/ui/src/theme/semantic-colors.ts:53-58` FALLBACKS는 또 DESIGN.md 구값을 써서 같은 패키지 내부 모순.
16. **카드 radius**: DESIGN.md `rounded-md`(8px) vs 실제 Card default `rounded-xl`(12px, `packages/ui/src/primitives/card.tsx:8`) — 앱 전체 일관되므로 문서가 뒤처진 상태.
17. **빈 상태 여백**: DESIGN.md `py-16` vs 실제 전부 `py-24` (또는 채팅 상세 `py-8`, 상세 화면 여백 0). 아이콘 유무·타이포(text-base/lg/sm)·CTA 유무가 화면별 제각각 — 공유 EmptyState 컴포넌트 부재가 근원.
18. **모바일 다크 모드 미구현**: `packages/ui/styles/globals.css`에 `.dark` 블록 0건, `useColorScheme.setColorScheme` 빈 구현. 데스크톱은 완전 지원. `text-white`×`bg-app-text` 조합 15곳+가 다크 활성화 시 흰 바탕 흰 글자 될 잠재 리스크.
19. **기타 UI**: 데스크톱 그래프 팔레트 하드코딩(`KnowledgeGraph.tsx:13-17`, `--chart-1..5` 토큰 미사용), 데스크톱 green 상태색 raw 사용(`DesktopSyncSection.tsx:34` 등), tooltip `bg-white` 하드코딩(`packages/ui/src/primitives/tooltip.tsx:33`), `QueryStateScrollView`의 atomic 레이어 침범+한국어 고정 카피, 아이콘 크기 20/22 혼용, `NAV_THEME` 사코드(`src/lib/constants.ts:1-17`, 참조 0건).

## 상세 분석

### 1. UI/디자인 (에이전트 1)
- **색상 토큰 규율 매우 높음**: 모바일 화면/컴포넌트 하드코딩 hex 0건, rgba 0건. 태그 팔레트 전부 `bg-tag-*-bg`/Badge variant로 소비. 하드코딩은 브랜드 로고 2종, 데스크톱 그래프 팔레트, 데스크톱 green, tooltip bg-white 정도의 산발 항목.
- **레이어 아키텍처 양호**: primitives 17개 전수 확인 결과 features/queries/stores 의존 0건, `<ui.X>` 네임스페이스 조합 0건. 유일 구조 위반은 `packages/ui/src/common/QueryStateScrollView.tsx`(도메인 상태 오케스트레이션+한국어 고정 카피 `:52,:118`).
- **화면 매트릭스**: 9개 화면 전부 ScreenHeader 사용(우수), px-6 일관 준수. 불일치는 카드 간격 mb-2/2.5/3/4, 내부 p-3.5/p-4 혼용, 인라인 padding 숫자 vs className 혼용(capture·chat/[id]·QueryStateScrollView), CTA 3종 형태.
- 다크 모드는 데스크톱 `.dark` 블록에 DESIGN.md 값(`#191919/#242424/rgba(255,255,255,0.08)/#e3e2de`) 그대로 구현 — 모바일만 미구현.

### 2. 코드 정합성 (에이전트 2)
- **브리지 표면 완전 정합**: Rust 40 `#[command]` ↔ generated TS 40 ↔ schema.json 40. camelCase rename, Option→`T|null`, enum-string, `RecommendationIo.itemA_id` serde rename 핀까지 정합. `calculateNextReview`는 브리지에서 제거→양앱 TS 스케줄러 주입으로 일관.
- **쿼리 키**: 팩토리 2벌(desktop `packages/hooks/src/query-keys.ts` vs mobile `apps/mobile/src/lib/query-keys.ts`)이 드리프트 근원. 프리픽스 매칭으로 커버되는 정합 케이스 다수 확인. 문제 케이스는 요약 2~4번.
- **타입**: 도메인 코어(KnowledgeItem ↔ KnowledgeItemIo) 정합. UI/기기 계층에 수동 복제 누적: `ManagedModelRecord` 2벌, `LocalLLMModelFamily` 2벌(순서만 상이), `CoreClient` vs `MobileCoreClient`(`calculateNextReview` 반환 시그니처 어긋남 — shared는 stability/difficulty 포함, 모바일은 `{intervalMs, nextReviewAt}` 축소), 모델 메타데이터 셰이프 5종, DownloadStatus 어휘 이원화, DownloadProgress 3벌, 스트림 페이로드 수동 복제.
- **캐스트**: `create-rustra-core-client.ts:85-173` 약 20곳 와이어→도메인 단언(Rust 쪽 파싱 계약이 방어), `useReviewMutations.ts:71,105,125` `as Partial<KnowledgeItem>`.

### 3. 기능/동작 (에이전트 3)
- 플랫폼 비대칭은 대부분 문서화된 설계(웹 명시적 스텁, 데스크톱 포그라운드 훅 대체, 데스크톱 리마인더 in-process 재시작 소실 문서화). 무문서 리스크 2건: (a) 웹 번들이 `llama.rn`을 직접 import하는 `on-device-embedder.ts:1`(useMobileSemanticRerank가 소비, dist-web 번들에서 문자열 확인), (b) 업데이터 껍데기.
- 설정/엔타이틀먼트 정합: Bonjour `_glimpse-sync._tcp`, NSLocalNetworkUsageDescription, App Group, POST_NOTIFICATIONS(플러그인 자동 주입), cleartext LAN — 전부 코드 사용과 일치. ShareExtension 활성화 규칙 = app.json 정합.
- 스토어 드리프트는 `local-core-store.ts` 1건뿐. TODO/FIXME도 `chat-generation.ts:97`(실제 미구현 맞음) 외 실질 마커 없음.

### 4. 문서 vs 코드 (에이전트 4)
- **플랜 문서 "완료" 주장 대부분 코드로 확인됨** — 커밋 히스토리와 정밀 대응. 유일 부분 항목: core-loop C4(데스크톱 스텁 토스트)는 설계 문서에 의도적 생략 기록, mDNS 3.2/3.5는 아래 참고.
- **mDNS 플랜의 "TS는 얇은 어셈블리" 주장과 실제 괴리**: 3.2(iOS dnssd)와 3.5(TS 어댑터 전환)는 Android만 전환됨 — 위 요약 5~6번과 동일 실체. 플랜 문서상 "완료"와 코드 실제 사이 이 간극이 가장 큰 문서-코드 드리프트.

## 코드 참조
(위 각 항목에 file:line 인라인 표기. 주요 파일)
- `apps/mobile/src/hooks/useCaptureFormState.ts:9` — 미연결 공유 인텐트 프리필
- `packages/hooks/src/mutations/useRecommendationMutations.ts:20` vs `apps/mobile/src/hooks/mutations/useRecommendationActions.ts:60` — 무효화 정합/부정합
- `packages/bridge-rust/src/sync_plan.rs` — 데드 커맨드 6종
- `packages/ui/styles/globals.css` — 실제 토큰 값 (DESIGN.md와 태그색 10개 상이)
- `packages/ui/src/theme/semantic-colors.ts:53-58` — FALLBACKS 구값 모순
- `apps/desktop/src-tauri/tauri.conf.json:38-39` — 업데이터 빈 설정

## 아키텍처 인사이트
- **"구현은 됐는데 배선이 안 된" 패턴**이 이 저장소의 주된 불일치 유형: 공유 인텐트 프리필, sync_plan TS 전환, iOS dnssd, 모바일 recommendations.all 무효화, 데스크톱 detail 쿼리 갱신 전부 동일 패턴. 커밋 단위로는 완료돼도 **마지막 소비자 연결**이 빠지는 경향.
- **플랫폼 쌍둥이 코드의 비대칭 적용**: 쿼리 키 팩토리 2벌, 백오프 3벌, 스트림 페이로드 복제 — 한쪽(desktop)에만 반영된 정렬 작업이 반복됨. 공유 패키지로의 승격이 구조적 해법.
- **문서가 코드의 '의도'를 기술하고 코드가 진화하면 문서가 못 따라감**: DESIGN.md 태그색·radius·여백, README 커맨드 수, CHANGELOG 전체.

## 히스토리 컨텍스트 (thoughts/ 디렉터리)
- `thoughts/shared/research/2026-08-30_20-46-17_remaining-development-tasks.md` — 직전 리서치: 잔여 과제(GUI 수동 검증·실기기·EAS 자격증명) 대조. 본 감사의 기능/동작 에이전트가 참조.

## 관련 리서치
- `thoughts/shared/research/2026-08-30_20-46-17_remaining-development-tasks.md`

## 미해결 질문
1. 공유 인텐트 프리필: capture.tsx가 `useCaptureFormState`로 전환되면 기존 자체 state 로직(초기 타 선택, 저장)과 충돌 없는지 — 구현 시 확인 필요.
2. 모바일 다크 모드: 토큰에 dark 값 추가 시 기존 `text-white` 15곳+의 수정 범위.
3. sync_plan TS 전환: Android 전환 시 발견됐을 JSI 오버헤드 등 iOS 전환을 막은 기술적 이유가 문서화돼 있지 않음 — 의도인지 누락인지 확인 필요.
4. 웹 타깃의 실사용 여부 (`bun run web`이 실제 지원 목표인지 — llama.rn 임포트 문제 처리 방향이 달라짐).
