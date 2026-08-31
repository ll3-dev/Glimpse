# Living Knowledge Graph Phase E 검증 기록

- 검증 시각: 2026-08-31 18:32 KST
- 코드 기준: `c94e581b7f7bbbca7703ceec362fe1fdd9b29a17`
- 범위: 데스크톱 전역 캡처 shell, 트레이, 창 수명, 캡처→Living Graph 자동 반영

## 구현 증거

- `6232f1e`: `CommandOrControl+Shift+K`와 트레이 메뉴를 Tauri shell에 연결하고,
  `capture | graph`로 제한된 이벤트만 프런트 라우터에 전달한다.
- `530eab7`: shell 이벤트로 캡처를 저장한 뒤 별도 그래프 생성 버튼 없이 Living Graph
  분석을 commit하고, sync 재검증에서도 중복 commit하지 않는 프로덕션 번들 E2E다.
- `c94e581`: app/tray 아이콘을 번들에 넣고 macOS ad-hoc 서명을 명시했다. 닫기로 숨긴
  창은 Dock/Spotlight 재실행의 `RunEvent::Reopen`에서도 복원한다.

트레이 action은 열기, 빠른 캡처, 지식 그래프, 종료의 bounded ID만 처리한다. 캡처와
그래프 action은 main window를 show·unminimize·focus한 뒤 route event를 보낸다. 창의
닫기 버튼은 프로세스를 종료하지 않고 숨기며, 명시적인 quit만 `app.exit(0)`으로 끝낸다.

## 현재 트리 자동 검증

| 명령 | 결과 |
| --- | --- |
| `bun test` | PASS — 878 tests, 0 fail, 2,152 expectations, 148 files |
| `bun run lint` | PASS — 모바일 Expo lint와 데스크톱 ESLint |
| `bun run typecheck` | PASS — 모바일 TypeScript |
| `bun run desktop:typecheck` | PASS — 데스크톱 TypeScript |
| `bun run desktop:build` | PASS — Vite production build, 2,222 modules |
| `cargo test --workspace` | PASS — 168 tests, 0 fail 및 doc-tests |
| `cargo clippy --workspace --all-targets -- -D warnings` | PASS |
| `cd apps/mobile && bun run sync:e2e` | PASS — headless bidirectional sync E2E |
| `cd apps/desktop && bun run test:e2e` | PASS — 2 smoke tests |
| `cd apps/desktop && bunx playwright test --config playwright.graph-gui.config.ts` | PASS — 2 graph GUI tests |
| `cd apps/desktop && bun run test:e2e:shell-capture` | PASS — 1 capture→graph test |
| React Doctor `apps/desktop` | 종료 0 — 83/100, Phase E 파일 진단 없음; 기존 파일 warning 10개 |

root 전체 React Doctor는 `main`에서 changed scope를 계산하지 못해 575개 파일을 full
scan했고 기존 모바일·데스크톱 파일의 error 5개와 warning 23개로 종료 1이었다. Phase E
파일은 진단 목록에 없었다. 동시 진행 중인 다른 문제 수정과 겹치는 광범위 정리는 이번
커밋에 섞지 않았다.

## macOS 패키지 런타임

실행한 산출물은
`target/release/bundle/macos/Glimpse.app`이다.

| 확인 | 결과 |
| --- | --- |
| `bun run tauri:build -- --bundles app` | PASS — release binary와 app bundle 생성 |
| `codesign --verify --deep --strict --verbose=2 .../Glimpse.app` | PASS — valid on disk, Designated Requirement 충족 |
| 번들 구조 | `Contents/Resources/icon.icns`, `_CodeSignature/CodeResources` 포함 |
| 서명 | ad-hoc, hardened runtime, sealed resources 1개 |
| 실행 파일 SHA-256 | `7d5b633f6ac78c891a0b7041ba4556299b232f5f0e85e900c5e001ba8d7b7a77` |
| ICNS SHA-256 | `809fadd7028875adcb267bf3e2a0ca9ddfc7c6d03957201b81ce435b3226b48c` |

Computer Use가 `so.glimpse.desktop`의 production app을 식별해 실제 `/library` 화면과
접근성 트리를 읽었다. 닫기 버튼 클릭 뒤 창은 사라졌지만 같은 executable PID가 유지됐다.
같은 `.app`을 다시 열자 첫 구현에서는 창이 복원되지 않았고, 이 실패를 `RunEvent::Reopen`
계약 테스트와 구현으로 수리했다. 재빌드 뒤 같은 순서에서 창이 다시 표시되는 것을 확인했다.

마지막으로 app executable을 터미널에 연결해 실행했다. startup 동안 shell의 단축키 등록
실패가 stderr에 없었고 tray setup이 성공해 앱이 유지됐다. Computer Use가 창을 식별했으며 명시적
`Cmd+Q` 후 프로세스가 exit 0으로 끝났다.

이 번들은 로컬 검증용 ad-hoc 서명이다. Apple Developer ID 서명과 notarization은 하지
않았으므로 외부 배포 준비 완료를 뜻하지 않는다.

## 자동화 경계와 남은 수동 게이트

Computer Use의 `press_key`는 전역 단축키를 합성하지 않으며 macOS SystemUIServer의 상태
메뉴도 접근성 앱 목록에 노출하지 않았다. 따라서 아래 두 OS 상호작용은 실제 완료 증거가
아니며 수동 게이트다.

1. 담당자: macOS 릴리스 점검자
   - 실행: `open target/release/bundle/macos/Glimpse.app`
   - 다른 앱을 전면에 두고 `Cmd+Shift+K` 입력
   - 기대: Glimpse 창이 복원되고 `/capture`가 열린다.
2. 담당자: macOS 릴리스 점검자
   - 창을 닫은 뒤 메뉴 막대 Glimpse 아이콘에서 `빠른 캡처`, `지식 그래프`,
     `Glimpse 종료`를 차례로 확인
   - 기대: 앞의 두 메뉴는 각각 `/capture`, `/graph`로 복원하고 종료는 프로세스를 끝낸다.

캡처 저장→Living Graph 반영은 별도 in-memory IPC E2E에서 실제 저장·분석 command 호출과
0-edge 완료 watermark, sync 후 비중복까지 검증했다. 반면 위 수동 게이트에서는 기존 사용자
DB를 보호하기 위해 fixture 지식을 저장하지 않았다.

Phase E의 구현과 자동·패키지 런타임 증거는 완료됐다. 물리 키와 트레이 메뉴 클릭을 통과하기
전에는 Living Knowledge Graph 전체 프로그램 완료를 주장하지 않는다.
