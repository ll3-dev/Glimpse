# Living Knowledge Graph Phase D 검증 기록

- 검증 시각: 2026-08-31 17:56 KST
- 코드 기준: `314c2e87442ae2e84f9831f2eb275c6161d152a4`
- 범위: 로컬 품질 집계, 플랫폼 로컬 사용·실행 카운터, 합성 증분 처리 receipt

## 구현 증거

- `2ae5b35`: 현재 워터마크와 backlog, 유효 연결·고립 항목, 상태 비율을 계산하는
  공유 순수 집계
- `cd86753`: 모바일 MMKV·데스크톱 localStorage에 발견 상세 이동, 성공/실패 실행,
  처리·생략 수와 최근 20개 duration 표본을 fail-open으로 저장
- `314c2e8`: 원문을 사용하지 않는 콜드 스타트·무변경·수정·삭제·동기화 receipt 명령

로컬 저장 값은 숫자 집계와 시각만 포함한다. 제목, 본문, URL, 태그, 요약, 근거,
프롬프트, API 키는 저장하거나 receipt에 출력하지 않는다.

## 자동 검증

| 명령 | 결과 |
| --- | --- |
| `bun test` | 147 files, 876 pass, 0 fail, 2,146 assertions |
| `bun run lint` | 모바일 Expo lint 및 데스크톱 ESLint 통과 |
| `bun run typecheck` | 모바일 TypeScript 통과 |
| `bun run desktop:typecheck` | 데스크톱 TypeScript 통과 |
| `bun run desktop:build` | Vite production build 통과, 2,221 modules |
| `cargo test --workspace` | 164 pass, 0 fail 및 doc-tests 통과 |
| `cargo clippy --workspace --all-targets -- -D warnings` | 통과 |
| `bun run --cwd apps/mobile sync:e2e` | headless bidirectional sync E2E 통과 |
| React Doctor mobile changed scope | 100/100, issue 0 |
| React Doctor desktop changed scope | 100/100, issue 0 |

첫 sandbox 내부 `cargo test --workspace`에서는 다운로드 무결성 테스트 두 개가 앱의 실제
models 디렉터리에 fixture를 쓰지 못해 `Operation not permitted`로 실패했다. 같은 전체
명령을 허용된 외부 실행으로 다시 수행해 두 테스트를 포함한 164개가 모두 통과했다.

## Receipt 재현 증거

공통 실행 조건은 Bun 1.4.0, macOS arm64, 시나리오별 60 samples, sample당 500 operations다.
두 실행의 build fingerprint는
`7239b36c1b019d7c6aaef6d92c479cbe432702a8c716d6df1ea35ba954f8ba26`로 같다.

| Receipt | generatedAt | input fingerprint | SHA-256 |
| --- | --- | --- | --- |
| `living-graph-phase-d-a.json` | `2026-08-31T08:55:28.892Z` | `59583087…bc83` | `b9498119…9d50` |
| `living-graph-phase-d-b.json` | `2026-08-31T08:55:29.659Z` | `904fd15d…aaa` | `34dd158a…5316` |

### 항목당 순수 집계 시간 분포

| 시나리오 | A p50 / p95 (ms) | B p50 / p95 (ms) | 검증된 상태 변화 |
| --- | ---: | ---: | --- |
| cold start | 0.002839 / 0.006473 | 0.002841 / 0.005485 | 24 target, 24 backlog |
| unchanged | 0.005434 / 0.006930 | 0.005588 / 0.007621 | 24 completed, 24 skipped |
| updated | 0.004704 / 0.005782 | 0.004818 / 0.005767 | 3 backlog, 21 skipped |
| deleted | 0.005326 / 0.006237 | 0.005477 / 0.006669 | 23 items, orphan 제외 후 11 edges |
| synced | 0.004893 / 0.005772 | 0.004934 / 0.005958 | 2 backlog, 24 skipped |

## 증명 경계

- receipt는 실제 제품 엔진의 `planLivingGraphCycle`과
  `computeLivingGraphQualityMetrics`를 합성 토폴로지에 실행한 microbenchmark다.
- 위 시간은 순수 TypeScript 계획·집계 비용만 증명한다. AI 추론, SQLite/bridge I/O,
  네트워크 동기화, 렌더링 또는 실기기 지연을 나타내지 않는다.
- 삭제 시 고아 연결 제외와 동기화 유입 시 신규 backlog 판정은 receipt assertion과 기존
  Rust 저장소·동기화 테스트가 각각 증명한다.
- Phase C 데스크톱 GUI 런타임 게이트와 Phase E 전역 캡처는 이 단계의 완료 근거가 아니며
  전체 프로그램 완료 전 별도로 검증한다.
