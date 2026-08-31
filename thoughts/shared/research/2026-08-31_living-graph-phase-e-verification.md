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
| `bun test` | PASS — 881 tests, 0 fail, 2,163 expectations, 150 files |
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

## OS 물리 입력과 트레이 게이트 종료 후속

초기 기록의 자동화 경계는 macOS System Events의 실제 키 코드 입력과 상태 메뉴 접근으로
후속 검증했다.

1. Finder가 전면인 상태에서 물리 키 코드 40과 `command down, shift down`을 보내자
   프로덕션 앱이 복원되고 `/capture`가 열렸다.
   - 화면: `/Users/loopy/Desktop/screenshot-2026-08-31_18-45-23.png`
2. 실제 Glimpse 상태 메뉴에서 `Glimpse 열기`, `빠른 캡처`, `지식 그래프`,
   `Glimpse 종료`를 읽고 각각 클릭했다.
   - 메뉴: `/Users/loopy/Desktop/screenshot-2026-08-31_18-47-12.png`
   - 빠른 캡처: `/Users/loopy/Desktop/screenshot-2026-08-31_18-47-38.png`
   - 지식 그래프: `/Users/loopy/Desktop/screenshot-2026-08-31_18-48-02.png`
   - Glimpse 열기: `/Users/loopy/Desktop/screenshot-2026-08-31_18-48-33.png`
3. `Glimpse 종료` 클릭 뒤 해당 executable 프로세스가 남지 않은 것을 확인했다.

캡처 저장→Living Graph 반영은 별도 in-memory IPC E2E에서 실제 저장·분석 command 호출과
0-edge 완료 watermark, sync 후 비중복까지 검증했다. 실제 그래프에서는 임시 fixture로
연결선 선택과 피드백 저장까지 확인한 뒤 공식 `delete_all_data()` 경로로 제거했다.

## 최종 프로덕션 번들 및 데이터 상태

- 재빌드: `bun run tauri:build -- --bundles app` — PASS
- 번들 ID: `so.glimpse.desktop`
- codesign: valid on disk, Designated Requirement 충족
- 실행 파일 SHA-256: `d500c8100c03b1f6e12d3196fbf9d723194cabed76a81cdc78c971fd890d8727`
- 프로덕션 `knowledge_items`, `recommendations`, `feedback_events`, `conversations`,
  `messages`, `graph_analysis`: 모두 0행
- `PRAGMA quick_check`: `ok`
- 빈 그래프 화면: `/Users/loopy/Desktop/Glimpse-empty-graph-2026-08-31.png`
- 삭제 전 백업:
  `/Users/loopy/Library/Application Support/so.glimpse.desktop/pre-delete-backups/glimpse-core-before-delete-2026-08-31_18-52.db`
  (`SHA-256 de3ba4fdddc8c707ec801bb6b56627593ba8fd99961da180f70fab7b3f4659d3`)

Phase E의 구현·자동·패키지 런타임과 OS 물리 입력 게이트가 모두 완료됐다.
