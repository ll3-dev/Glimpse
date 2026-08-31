# Living Knowledge Graph Phase C 검증 기록

- 검증 시각: 2026-08-31 17:37 KST
- 기준 브랜치: `main`
- 기준 커밋: `f95eb24`
- 범위: 오늘의 발견, 포커스 레이아웃, 엣지 근거·피드백, 검색·상세→그래프 진입

## 구현 증거

- `selectTodayDiscoveries`는 유효 endpoint의 pending을 근거 품질·최신성 순으로 고르고,
  pending이 없을 때만 최근 accepted로 폴백한다.
- `layoutFocusedGraph`는 focus를 중앙, 1-hop 이웃을 안쪽 링, 나머지 context를 바깥
  링에 배치하며 36개 제한에서도 focus와 이웃을 우선 보존한다.
- 모바일과 데스크톱은 오늘의 발견 카드에서 두 지식 상세, 그래프 포커스, 수락·무시·
  나중에 액션을 제공한다.
- 연결선을 선택하면 근거와 양 endpoint 상세 이동 및 pending 피드백 액션을 보여준다.
- 모바일 `focusId`는 URL params가 진실 소스여서 이미 마운트된 탭으로 재진입해도 최신
  검색/상세 focus를 사용한다. 데스크톱은 검증된 `focus` search를 초기 포커스로 쓴다.
- 데스크톱 SVG 노드와 연결선은 클릭뿐 아니라 Enter/Space 키로도 선택할 수 있다.

## 현재 트리 자동 검증

| 명령 | 결과 |
| --- | --- |
| `bun run test:coverage` | PASS — 655 tests, 0 fail, 1,543 expectations, 105 files |
| 관련 graph/mobile/desktop 테스트 | PASS — 20 tests, 0 fail |
| `bun run --cwd apps/mobile lint` | PASS |
| `bun run --cwd apps/desktop lint` | PASS |
| `bun run --cwd apps/mobile typecheck` | PASS |
| `bun run --cwd apps/desktop typecheck` | PASS |
| `bun run desktop:build` | PASS — Vite 2,218 modules, production bundle 생성 |
| `npx -y react-doctor@latest . --verbose --scope changed` | PASS — 100/100, no issues |
| `bun run desktop:tauri:dev` | PASS — Rust dev profile build 후 `target/debug/glimpse-desktop` 실행 |

## 모바일 Simulator 런타임

- 기기: iPhone 17, iOS 26.2 Simulator
- Metro: `http://localhost:8081`, 개발 번들 다운로드와 React 화면 mount 확인
- 빈 상태: `/tmp/glimpse-phase-c-mobile-graph.png`
- fixture 포커스 라이트: `/tmp/glimpse-phase-c-mobile-focus-ready.png`
- fixture 포커스 다크: `/tmp/glimpse-phase-c-mobile-focus-dark.png`

빈 테스트 DB에 `phase-c-*` 메모 3개와 pending 연결 2개를 넣고 다음을 시각 확인했다.

- `오늘의 발견` 제목·두 항목·근거·수락/무시/나중에
- `focusId=phase-c-a` 중앙 포커스와 2개 1-hop 연결
- 선택 바의 연결 수·근거·상세 보기
- 라이트/다크 semantic token 전환

검증 뒤 앱을 종료하고 fixture recommendation/knowledge를 삭제했으며 두 범위의 잔여
row가 각각 0개임을 다시 조회했다. Simulator 외관도 라이트로 복원했다.

## 증거 경계와 수동 잔여

- 설치돼 있던 Simulator 앱의 로컬 DB에는 Phase B의 `graph_analysis` 테이블이 없었다.
  따라서 이번 Simulator 화면은 Phase C의 JS UX와 기존 recommendation 읽기 계약을
  검증하며, 새 Phase B native command 런타임을 검증한 것으로 간주하지 않는다. Phase B
  네이티브 라이브러리 자체는 별도 빌드 기록에서 검증했다.

## 데스크톱 GUI 자동 검증 후속 (2026-08-31)

위 기록에서 "검색→포커스, edge click, 피드백 반영의 실제 GUI 조작은 수동 미완료"로
남겼던 항목을 Playwright 자동화로 수행했다.

- 실행 시각: 2026-08-31 (마감 세션)
- 방식: **브라우저(Chromium) + `vite preview`(프로덕션 번들) + Tauri IPC 스텁** 위
  검증이다. 실제 Tauri 네이티브 창을 조작한 것이 아니므로 네이티브 창 크기·메뉴·
  네이티브 다이얼로그 등 OS 레벨 동작은 커버하지 않는다.
- 스텁 데이터: 지식 항목 3개(gui-a/b/c) + pending 연결 2개(rec-1/rec-2) fixture.
  `respondToRecommendation` 호출은 `window.__glimpseRespondCalls`에 기록해 검증.
- 결과: `bunx playwright test --config playwright.graph-gui.config.ts` → **2 passed**
  1. 라이브러리→검색어 입력→"그래프로 보기"→`/graph?focus=` 진입, "오늘의 발견" 카드
     (수락/무시/나중에 보기) 노출, 수락 시 `respondToRecommendation`이 rec-2·accepted로
     기록됨. fixture상 rec-2가 rec-1보다 최신이므로 발견 규칙(근거 품질 동률→최신성)
     에 따라 rec-2가 노출되는 것이 정상.
  2. 상세(/library/gui-a)→"그래프에서 주변 보기" CTA→`/graph?focus=gui-a` 진입,
     엣지 클릭→근거 패널 표시.
- 스크린샷(육안 확인 완료): `/tmp/gui-graph-focus.png`(발견 카드+노드 인스펙터),
  `/tmp/gui-graph-edge.png`(3노드+엣지+근거 패널).
- 검증 파일: `apps/desktop/e2e/graph-gui-verify.ts`,
  `apps/desktop/playwright.graph-gui.config.ts`(본체 config가 testMatch를
  e2e-smoke.ts로 고정해 별도 설정 필요).
- 잔여: 실제 Tauri 네이티브 창에서의 수동 GUI 조작은 여전히 미수행. 위 경계와
  동일하게 네이티브 런타임 검증으로 간주하지 않는다.
- 현재 세션에는 Browser 인스턴스가 없었고 `cargo run` 개발 바이너리는 macOS 앱 목록에
  등록되지 않아 Computer Use가 창을 식별하지 못했다. 데스크톱은 production build와
  Tauri build/launch까지 확인했지만 검색→포커스, edge click, 피드백 반영의 실제 GUI
  조작은 수동 미완료로 남긴다.
- 원격 AI 계정과 iOS/Android 실기기 장시간 전환은 실행하지 않았다.

따라서 Phase C 구현과 자동 계약은 완료됐지만, 전체 Living Knowledge Graph 프로그램
완료는 아직 주장하지 않는다.
