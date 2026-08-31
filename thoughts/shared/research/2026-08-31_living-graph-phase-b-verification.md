# Living Knowledge Graph Phase B 검증 기록

- 검증 시각: 2026-08-31 17:14 KST
- 기준 브랜치: `main`
- 기준 커밋: `3d0e1d7`
- 범위: 정규 엣지 쌍, 분석 워터마크, 공유 증분 엔진, 모바일·데스크톱 코디네이터

## 구현 증거

- SQLite schema v5가 항목별 `graph_analysis` 레코드를 저장하며, 0-edge 완료도 별도
  워터마크로 남긴다.
- 엣지와 워터마크는 한 트랜잭션에서 커밋되고 정규 노드 쌍의 역순 재삽입은 실제
  엣지를 늘리지 않는다.
- 삭제와 delta tombstone은 닿는 피드백, 엣지, 워터마크를 정리한다.
- 모바일과 데스크톱은 `packages/features/src/graph`의 같은 dirty 계획, 쌍 정규화,
  태그 폴백을 사용한다.
- AI가 비어 있거나 실패하면 결정론적 태그 폴백을 사용하고, 결과가 0개여도 분석을
  완료한다.
- 모바일 네이티브 브리지 빌드는 host용 `generate` binary를 교차 링크하지 않도록
  `cargo build --lib`만 사용한다.

## 현재 트리 자동 검증

| 명령 | 결과 |
| --- | --- |
| `bun run test:coverage` | PASS — 652 tests, 0 fail, 1,535 expectations, 103 files |
| `cargo test --workspace` | PASS — bridge 17 + command 15 + core 59 + desktop lib/main 각 32 + integration/doc tests |
| `cargo clippy --workspace --all-targets -- -D warnings` | PASS |
| `bun run lint` | PASS — Expo ESLint + desktop ESLint |
| `bun run typecheck` | PASS — mobile `tsc --noEmit` |
| `bun run desktop:typecheck` | PASS — desktop `tsc --noEmit` |
| `bun run --cwd apps/mobile sync:e2e` | PASS — pairing, 양방향 delta, 실패 후 cursor 고정, 복구 재전송 |
| `bun run --cwd apps/mobile build:bridge:ios` | PASS — device/simulator release staticlib + XCFramework |
| `bun run --cwd apps/mobile build:bridge:android` | PASS — 4 ABI release staticlib staging |

네이티브 빌드는 새 그래프 명령을 포함한 브리지 소스에서 다시 생성했다. iOS 빌드 중
CoreSimulator sandbox 경고가 있었지만 `xcframework successfully written out`으로
종료했고 명령 자체는 성공했다.

## 시나리오 대응

- 캡처·수정·라벨·동기화 뒤 dirty 판정: items source key와 워터마크의 `updatedAt`
  불일치 테스트로 고정했다.
- 0-edge 반복 실행: 첫 실행은 completed 레코드를 저장하고 다음 실행은 `no_dirty`로
  건너뛴다.
- 역순·반복 실행: 저장소 정규 쌍 제약과 `ON CONFLICT DO NOTHING`으로 멱등이다.
- 삭제·동기화 tombstone: Rust 저장소 테스트가 고아 그래프 데이터 제거를 검증한다.
- 오프라인·복구 sync: headless E2E가 cursor를 고정하고 복구 후 재전송함을 검증한다.

## 수동 잔여

Phase B 자체의 자동 계약은 완료했다. 계정이 필요한 원격 AI 제공자와 iOS/Android
실기기의 장시간 포그라운드 전환은 이번 기록에서 실행하지 않았으며 완료로 간주하지
않는다. 이후 Phase C/E의 UI·OS 통합 런타임 게이트와 함께 별도 증거를 남긴다.
