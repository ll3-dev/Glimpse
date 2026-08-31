# 설계: 3단계 로드맵 — 게이트 소화 → 모바일 그래프 뷰 → 데스크톱 캡처 동선

- 날짜: 2026-08-31
- 상태: 승인됨 (사용자 지시 "게이트→그래프→캡처 모두 지원, plan·implement까지 진행")
- 근거 리서치:
  - `thoughts/shared/research/2026-08-30_22-49-26_full-consistency-audit.md`
  - `thoughts/shared/research/2026-08-30_20-46-17_remaining-development-tasks.md`

## 배경

8/30 전체 일관성 감사 이후 약 40커밋으로 P0·P1 결함과 데드 코드·문서 드리프트가
정리됐다. 코드 레벨 부채는 거의 0이고, 남은 것은 (1) 검증·배포 게이트,
(2) 플랜 문서에 명시된 후속 설계 후보 2건(모바일 그래프 뷰, 데스크톱 캡처 동선)이다.
사용자는 세 워크스트림을 모두 진행하기로 했고, 순서는 게이트 → 그래프 → 캡처로 확정했다.

실행 구조는 **마스터 설계 1장(본 문서) + 단계별 상세 구현 플랜**으로 한다.
2·3단계 플랜을 지금 한 번에 쓰면 1단계 결과에 따라 부패하므로, 각 단계 착수 시점에
해당 단계의 플랜을 별도 문서로 작성한다.

---

## Phase 1 — 검증·배포 게이트 소화

> **✅ 완료 (2026-08-31, 3465ddd·289fbb0)** — 자동 게이트 최종 확인:
> lint·typecheck(모바일·데스크톱) exit 0, JS 테스트 646 pass/0 fail,
> Rust 157 pass/0 fail, clippy `-D warnings` clean, `sync:e2e` ALL PASSED.
> iOS 시뮬레이터 검증은 런치·렌더 확인(`glimpse-01-launch.png`: 탭 바 4개·AI 미설정
> 화면 정상)까지만 가능 — 라이브러리 탭 전환 딥링크는 expo-dev-client에 가로채져
> 자동화 불가. 잔여 수동 항목은
> [`2026-08-31_remaining-manual-gates.md`](/Users/loopy/dev/ll3/Glimpse/thoughts/shared/research/2026-08-31_remaining-manual-gates.md) 참조.

목표: 자동으로 증명 가능한 게이트를 전부 소화하고, 사람 손이 필요한 게이트를
정확히 분리해 문서로 남긴다.

### 자동 소화 항목

1. **회귀 게이트 전수 실행**: 워크스페이스 `bun test` + `bun run lint` + typecheck,
   `packages/bridge-rust` `cargo test`, 모바일 `bun run sync:e2e`.
2. **문서 정밀 대조**: `docs/plans/2026-08-16-rustra-integration-plan.md`의 GUI
   체크리스트 16항목 중 이후 라운드(실기기 동기화 검증 30706e9, 헤드리스 E2E 3b75412,
   실모델 검증 9d9ced5 등)로 실제 소화된 항목을 판별해 갱신.
3. **소액 청소(감사 잔여)**:
   - `apps/mobile/src/features/core/application/{chat,capture,knowledge,recommendation,review,state}/`
     deprecated 배럴 제거 (임포터 전환 확인 후)
   - `apps/desktop/src/features/ai/targets/executors.ts` deprecated `contextItem`(단수) 제거
4. **iOS 시뮬레이터 GUI 자동 검증**: `bun run ios` 기동 + `xcrun simctl` 스크린샷으로
   GUI 체크리스트 중 시각 확인 가능한 항목(탭 렌더, 라이브러리, 다크 모드 토글,
   채팅 진입 등)을 소화. 상호작용이 필요한 항목은 수동 목록으로 이관.

### 수동 잔여로 분류되는 항목 (사용자 몫)

- Android 실기기 검증 (사용자 사정으로 보류 중)
- EAS 자격증명 (Apple/Google 계정 필요)
- iOS/데스크톱 알림 실기기 발화 (21:00 리마인더, OS 권한 프롬프트)
- BGTaskScheduler 실기기 상행 델타
- Shortcuts 실기기 흡수(개발 언어 en으로 한국어 Siri 트리거 확인 불가 문제 포함)

### 산출물

- 게이트 실행 결과 기록 + `thoughts/shared/research/`에 잔여 수동 게이트 체크리스트 문서
- deprecated 배럴 제거 커밋

### 완료 기준

- 전체 자동 게이트 그린
- 수동 잔여 항목이 "누가·무엇을·어떻게" 수준으로 문서화됨

---

## Phase 2 — 모바일 그래프 뷰

> **✅ 완료 (2026-08-31, 0b8d938·3bca5ab·1cac6bf·93e47bc·e05c288)** —
> shared 레이아웃 전환, 시맨틱 차트 토큰, 모바일 그래프 캔버스·선택 바·연결 탭을
> 구현했다. iPhone 17 시뮬레이터에서 `ll3.kr://graph` 직접 딥링크로 연결 탭의 제목,
> 설명, 빈 상태, 선택된 탭을 렌더 확인했다(`/tmp/glimpse-graph-deeplink.png`). 계획의
> 임시 `index` redirect 방식은 hidden route와 `lazy: false` 조합에서 화면 본문이
> 비는 테스트 하네스 문제를 만들어 사용하지 않았고, 원래 `./library` redirect를
> 복원했다. 최종 검증은 모바일 전체 테스트 **652 pass/0 fail**, lint, 모바일·데스크톱
> typecheck exit 0이다.

목표: 데스크톱에만 있는 지식 그래프를 모바일에 제공해 기능 갭을 해소한다.

### 아키텍처

- **레이아웃 공유화**: `apps/desktop/src/features/graph/layout.ts`(순수 함수,
  KnowledgeItem/Recommendation → 노드·엣지 타원 배치)를 `packages/shared`로 승격.
  데스크톱은 shared에서 재수출하도록 전환해 쌍둥이 드리프트를 원천 차단.
  테스트도 함께 이동(`layout.test.ts`).
- **데이터**: `packages/hooks`의 `useKnowledgeItems`·`useRecommendations` 소비
  (모바일 라이브러리 상세가 이미 동일 소스 사용). 무효화 정합은 감사에서 이미 수리됨.
- **UI**: 새 탭 **"연결"** (`app/(tabs)/graph.tsx`, lucide `Network` 아이콘).
  - 렌더링: `react-native-svg`(이미 의존성 존재). 데스크톱과 동일한 시각 언어 —
    타원 배치 노드 원 + 중심 색점 + 라벨, 엣지 라인, tap 선택 시 인접 하이라이트·
    비인접 디밍.
  - 상호작용: 노드 탭으로 선택 토글 → 하단 선택 바에서 "상세 보기"로
    `library/[id]` 이동. 데스크톱의 hover 근거(tooltip) 대신 선택 바에
    엣지 reason 요약 노출.
  - 색상: 시맨틱 토큰(`useSemanticColor`)만 사용 — 모바일 다크 모드 자동 대응.
    팔레트 점 색상은 데스크톱 `--chart-*`에 대응하는 토큰이 모바일에 없으므로
    `packages/ui`에 차트 팔레트 시맨틱 토큰을 신설(light/dark 쌍).
  - 빈 상태: 공유 `EmptyState` 프리미티브 재사용.
  - 화면 구성은 `ScreenHeader` 패턴 준수, composed UI는
    `src/components/graph/`에 배치(atomic 위반 금지).

### 범위 외

- 힘 기반(force-directed) 레이아웃·줌·팬 — 데스크톱도 정적 배치이므로 패리티 유지가 YAGNI.
- 그래프에서의 엣지 편집 — 기존 상세 화면 경유.

### 테스트

- `packages/shared` 레이아웃 함수 단위 테스트(데스크톱 테스트 이식).
- 그래프 화면 컴포넌트 테스트(노드 렌더 수, 선택 하이라이트, 빈 상태).

### 완료 기준

- 모바일 탭에서 그래프 렌더·선택·상세 이동 동작
- 데스크톱 그래프가 shared 레이아웃으로 전환되며 회귀 없음
- bun test·lint·typecheck 그린

---

## Phase 3 — 데스크톱 캡처 동선 강화

목표: 데스크톱에서 지식 캡처까지의 동선을 단축한다.

### 아키텍처

- **전역 단축키**: `tauri-plugin-global-shortcut` 추가. 기본 단축키는
  `CmdOrCtrl+Shift+K`로 고정(설정 UI는 YAGNI). 발화 시 기존 캡처 진입
  (라이브러리의 캡처 다이얼로그/액션)을 포그라운드로 띄움.
- **트레이**: Tauri 2 트레이 API로 아이콘 + 메뉴(캡처 열기, 그래프 열기, 종료).
  트레이 클릭 → 메인 윈도우 표시.
- **스크린샷 캡처는 범위 외**: macOS 화면 녹화 권한·이미지 처리 파이프라인
  복잡도가 커서 후속 후보로만 기록한다.

### 검증

- `cargo check` + `bun run lint` + typecheck 그린
- `tauri dev` 기동 후 단축키·트레이 동작은 GUI 수동 항목으로 기록
  (headless에서 검증 불가 영역)

### 완료 기준

- 단축키·트레이 코드가 빌드되고 기존 기능 회귀 없음
- 수동 확인 절차가 플랜 문서에 체크리스트로 남음

---

## 리스크·의사결정 기록

1. **플랜 부패 방지**: 3단계를 한 플랜에 넣지 않고 마스터 설계 + 단계별 플랜으로
   분리. 감사가 지적한 "플랜 문서가 코드 진화를 못 따라가는" 드리프트 패턴 회피.
2. **쌍둥이 코드 방지**: 그래프 레이아웃은 복제가 아니라 shared 승격으로 해결.
   감사 인사이트("공유 패키지로의 승격이 구조적 해법")를 그대로 적용.
3. **차트 팔레트 토큰 신설**: 모바일엔 `--chart-*` 대응 토큰이 없어 신설이 필요.
   light/dark 쌍으로 정의해 다크 모드 회귀를 방지.
4. **iOS 시뮬레이터 자동 검증의 한계**: 권한 프롬프트·실기기 알림·Shortcuts는
   시뮬레이터로 커버 불가 — 무리하게 자동화하지 않고 수동 목록으로 분리.
5. **Phase 3 순서 의존**: Phase 2에서 그래프 탭 신설로 탭 바가 5개가 되므로,
   Phase 3 트레이 메뉴의 "그래프 열기"는 데스크톱 라우트라 영향 없음(독립).

## 성공 기준 (전체)

- Phase 1: 자동 게이트 전부 그린 + 수동 잔여 체크리스트 문서화
- Phase 2: 모바일 그래프 탭 실동작(시뮬레이터 스크린샷 증거) + shared 레이아웃 전환
- Phase 3: 단축키·트레이 구현 + 빌드 그린 + 수동 확인 절차 기록
- 모든 단계에서 `bun run lint`·typecheck·관련 테스트 그린 유지
