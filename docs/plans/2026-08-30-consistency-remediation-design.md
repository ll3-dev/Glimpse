# 전체 일관성 수리 설계 (Consistency Remediation Design)

> **날짜**: 2026-08-30
> **근거 리서치**: `thoughts/shared/research/2026-08-30_22-49-26_full-consistency-audit.md`
> **범위 결정**: 감사 발견 전체 포함 (P0 기능 결함 ~ 모바일 다크 모드 신규 구현)
> **사용자 결정 사항**: ① 범위 전체 포함 ② sync/iOS는 rustra로 전환(실행 시점에 최신 rustra 릴리스 재확인) ③ 다크 모드 완전 구현 ④ 데드 코드 전부 삭제

## 배경

4영역 전수 감사(UI/디자인·기능/동작·코드 정합성·문서 vs 코드)에서 와이어 계약과 엔타이틀먼트는 정합이지만, **"구현 완료·마지막 배선 누락" 패턴**과 **플랫폼 쌍둥이 코드 비대칭 적용 패턴**, **문서 드리프트**가 확인됨. 본 설계는 이를 수리한다.

---

## Part A — 기능 결함 수리

### A1. 공유 인텐트 프리필 배선 (P0)

**문제**: Share Extension/Shortcuts/Android 공유로 적립된 텍스트·URL이 캡처 폼에 주입되지 않음. 유일 구현 `useCaptureFormState`(`apps/mobile/src/hooks/useCaptureFormState.ts:9`)가 미소비, `app/capture.tsx:18`은 자체 `useState`로 빈 폼.

**수리**:
- `app/capture.tsx`의 자체 폼 state를 `useCaptureFormState` 훅으로 교체
- 데이터 흐름: Share 적립 → `ShareIntentNavigator`가 `/capture`로 이동 시 intent payload 전달(store 또는 router params) → `parseShareIntent` → reducer `apply_share_intent` → 프리필
- **역할 분리**: Shortcuts/quick note(`_directSave` 플래그)는 기존대로 자동 저장, 일반 공유는 프리필(사용자 편집 의도). `pending-share-processor`가 일반 공유를 자동 저장하지 않는지 분류 규칙 확인 후 조정
- 훅이 `useLocalSearchParams`도 지원해 캡처 진입 경로 전체 커버

### A2. recommendations 무효화 정렬 (모바일)

데스크톱 패턴(`recommendations.all` 프리픽스 무효화)을 모바일 4곳에 적용:
- `useRecommendationActions.ts:60` (respond)
- `useCaptureActions.ts:58` (저장), `:114` (삭제)
- `useAppForegroundRecommendations.ts:28` (포그라운드)

모바일 `query-keys.ts`에 `recommendations.graph` 토큰 추가(데스크톱 팩토리 정렬). 무효화는 `recommendations.all`로 통일.

### A3. 데스크톱 detail 쿼리 갱신

`useReviewMutations.ts`의 `patchKnowledgeItemInList` 확장: list setQueryData 후 `['knowledgeItems','detail',id]` exact 무효화 추가. dismiss/quality/patch 3개 뮤테이션에 동일 적용.

### A4. no-op 무효화 정리

`['models','available']` 무효화 5곳(`use-model-management.ts:132,147,162,178,193`) 제거 → 실소비 키 `['llm','overview']` 무효화로 교체.

---

## Part B — rustra 전환 (실행 시점 재확인 필수)

> **실행 전제**: 새 rustra가 곧 로컬 배포 예정. B 태스크 착수 시점에 반드시 최신 rustra 릴리스/버전 확인(`@rustra/types` 오버라이드, `bun run bridge:generate` 재생성 필요 여부) 후 그 기준으로 브리지 표면을 재검증하고 진행. 버전 간 API 차이가 있으면 그에 맞춰 조정.

### B1. sync_plan TS → Rust 전환

- `sync-client.ts`가 생성 클라이언트의 `normalizeBaseUrl`·`discoveryBaseUrl`·`endpointCandidates`·`recordSyncSuccess`·`recordSyncFailure`·`isHoldingOff`를 호출하도록 교체. 동기→비동기 전파 범위(호출부) 함께 수정
- TS 로직 파일 삭제: `sync-url.ts`, `backoff.ts`, `packages/shared/src/backoff.ts` — 백오프 상수 3벌 → Rust 1벌
- 타임아웃 클램프 3중 불일치 → Rust 기준 `[100,5000]`ms로 통일
- 테스트: `sync-client.*.test.ts` 기대값을 브리지 mock으로 교체. web 등 브리지 미가용 환경은 `initializeCore` 선례의 graceful fallback

### B2. iOS discovery → Rust dnssd 경로

- `modules/sync-discovery/src/index.ios.ts` 신설(Android `index.android.ts` 선례): `@glimpse/bridge-generated`의 `syncDiscover` 사용
- `DiscoveredPeer` → `DiscoveredSyncDesktop` reshape은 Android 로직 재사용
- Rust iOS 빌드 체인(aarch64 타깃 포함 여부) 확인·보강
- Swift 네이티브 모듈 삭제. Info.plist의 `NSBonjourServices`/`NSLocalNetworkUsageDescription`는 유지(동일 시스템 API)
- 검증: iOS 시뮬레이터 Bonjour 탐색 스모크 (실기기는 기존 잔여 항목과 별도)

---

## Part C — 데드 코드 삭제 + UI/디자인 정합

### C1. 데드 코드 삭제 (임포터 0건 전부)

- **구 캡처 폼**: `CaptureForm.tsx`, `CaptureChannelForm.tsx`, `HighlightForm.tsx`, `ScreenshotForm.tsx`, `ShareForm.tsx`, `ChannelSegment.tsx` + 배럴 정리
- **설정 UI**: `LocalLLMSection.tsx`, `AppleIntelligenceSection.tsx` (하위 로직 `appleIntelligenceToggle.ts`는 생존이므로 유지)
- **훅/스토어/유틸**: `useCaptureActionsMutation` 조합기(살아있는 개별 뮤테이션은 유지), `local-core-store.ts`, `processPendingSharesNow`, `getCoreDbPath`, `getAppGroupContainerPathSync`, `NAV_THEME`
- **쿼리 키**: `recommendations.weekly`, `llmQueryKeys.health/models/runtimes`, `chat.conversation(id)` 라이브 소비 없는 정의 (모바일 removeQueries 사용처는 유지)
- **이벤트**: `llm:stream-done` 고아 emit(데스크톱 `emit_llm_done`) 제거, 모바일 허브 정의는 소비처 재확인 후 처리

### C2. QueryStateScrollView 레이어 수리

로딩/에러/빈 상태 카피를 호출처 주입 방식으로 변경(기본값은 영어), 도메인 비의존 상태로 정화. windowed pagination은 훅으로 추출.

### C3. 모바일 다크 모드 (완전 구현)

1. **토큰**: `packages/ui/styles/globals.css`에 `.dark` 블록 추가 — 데스크톱 `.dark`와 동일 팔레트(`#191919`/`#242424`/`rgba(255,255,255,0.08)`/`#e3e2de`) + 다크용 태그 틴트 변형
2. **전환**: `useColorScheme.ts`의 빈 `setColorScheme`/`toggleColorScheme` 실제 구현 + 시스템 연동. 설정 화면에 라이트/다크/시스템 3옵션 세그먼트(데스크톱 토글 선례 정렬)
3. **네이티브**: 루트 배경·상태바·모달 배경 테마 연동
4. **text-white 수리**: `bg-app-text` 위 `text-white` 15곳+를 전경-on-반전 의미 토큰으로 치환. Toast/tooltip `bg-white`·스크림 `bg-black/50`도 토큰화
5. **FALLBACKS 통일**: `semantic-colors.ts:53-58`을 `globals.css` 신값으로

### C4. UI 패턴 통합

- **공유 EmptyState 신설**(`packages/ui/src/primitives/empty-state.tsx`): 아이콘+헤드라인+설명+선택 CTA, py-24 표준(compact prop 지원). 6개 화면 교체
- **아이콘 크기 정규화**: 헤더 액션 22→20px, 마이크로 12~13px→14px 하한
- **카드 간격 정규화**: 리스트 mb→mb-2, 내부 p→p-4
- **데스크톱 색 토큰화**: `KnowledgeGraph.tsx`→`--chart-1..5`, green 상태색→`success` 의미 토큰 신설 후 교체, `tooltip.tsx` `bg-white`→`bg-popover`
- **아이콘 헬퍼 수렴**: `apps/mobile/src/lib/icons/iconWithClassName.ts` 중복 제거

---

## Part D — 문서 동기화

- **DESIGN.md**: 태그색 10개를 `globals.css` 실값으로, 카드 radius `rounded-xl`, 빈 상태 `py-24`, 아이콘 크기 가이드, 다크 모드 "모바일 지원" 반영
- **README**: 커맨드 수 실측치, lint 설명(모바일+데스크톱) 수정
- **rustra-bridge-development.md**: 커맨드 수 갱신
- **플랜 문서**: `sync:e2e` 참조에 "apps/mobile에서 실행" 명시
- **CHANGELOG**: 8/21 이후 주요 기능 전부 Unreleased에 기록 (리마인더·양방향 델타 동기화·채팅 RAG·digest 최근 연결·Shortcuts 캡처·그래프 증분 분석·본 수리)

---

## 검증 게이트

- 각 파트 완료 시: `bun run lint` + `bun test` + 대상 플랫폼 smoke
- 전체 완료 후: `bun run ios` / `bun run android` / `bun run web` + 데스크톱 dev 스크린 체크
- 다크 모드: 시뮬레이터 라이트/다크 스크린샷 대비 검증
- B 파트: rustra 최신 릴리스 확인 기록을 커밋 메시지에 명시

## 리스크

| 리스크 | 완화 |
|---|---|
| B1 동기→비동기 전파가 sync-client 전체로 번짐 | 호출부별 단계적 전환, 테스트 우선 갱신 |
| B2 iOS Rust 빌드 체인 미검증 | 플랜 단계에서 빌드 스크립트 먼저 확인, 불가 시 Swift 경로 유지로 롤백 지점 명시 |
| 다크 모드 토큰 추가가 기존 화면 색 미세 변경 | 데스크톱 `.dark` 값 재사용으로 팔레트 일관, 라이트 모드 값은 무변경 |
| A1 pending-share-processor 역할 경계 | `_directSave` 플래그 분류 로직을 테스트로 잠금 후 배선 |
