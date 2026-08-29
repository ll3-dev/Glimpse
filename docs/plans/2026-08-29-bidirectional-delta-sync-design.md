# 양방향 델타 동기화 "즉시 전파" 설계

- 날짜: 2026-08-29
- 상태: 승인됨 (사용자 승인, 2026-08-29)
- 목표: desktop-mobile 어느 쪽에서든 변경이 몇 초 안에 반대편에 반영되는 연결 경험 완성
- 최우선 제약: **안전성** — 데이터 무손실 · 장애 복구 가능 · 보안 · 사용성 무방해
- 연관 문서: `docs/desktop-mobile-sync.md`, `docs/plans/2026-08-28-mdns-local-sync-design.md`

## 배경 (갭 분석 요약)

코드 조사(2026-08-29)로 확인된 현황:

- 동기화 페이로드는 `DataExport`(format_version 2) 5 도메인(knowledge_items, conversations, messages, recommendations, feedback_events) + tombstones (`packages/core-rust/src/models.rs:289`).
- 워터마크 델타(`export_delta`/`apply_delta`)는 **desktop→mobile 하행 전용**. 모바일의 로컬 변경(채팅 포함)은 10분 주기 전체 스냅샷(`FULL_SYNC_EVERY_MS`, `apps/mobile/src/features/sync/sync-client.ts:56`)으로만 상행 전파되고, 전체 스냅샷은 전체 병합(`merge_data`)을 유발한다.
- 5 도메인 전부에 델타 트리거(`sync_data_revision` 카운터)가 이미 걸려 있다(`storage/migrations/0004_delta_sync.sql`) — 상행 델타의 재료는 이미 존재한다.
- 데스크톱 그래프·다이제스트·채팅·복습이 전부 동일 스냅샷 데이터를 공유하므로, 상행 지연 제거가 연결 경험의 가장 큰 병목이다.

## Goal — 즉시 전파

**완료 기준:** iOS 시뮬레이터 + Desktop에서
1. 모바일 캡처 → 데스크톱 라이브러리 수 초 내 표시
2. 모바일 채팅 전송 → 데스크톱 채팅 목록 수 초 내 반영
3. 어느 쪽 복습 완료 → 양쪽 스케줄 수 초 내 일치
4. 동기화 중 데스크톱 강제 종료 → 재시작 시 데이터 이상 없음 + 사전 백업 존재
5. 네트워크 단절 중 모바일 변경 → 복구 후 자동 전파, 유실 없음

## 아키텍처

### 1. 상행 델타 (핵심 변경)

- 모바일이 자기 DB의 `sync_data_revision` 리비전을 추적하고, 동기화 요청에 `lastAckedRevision` 이후 변경분을 `export_delta(lastAckedRevision)`으로 첨부한다.
- 서버는 `apply_delta`로 모바일 델타를 병합한 뒤, 기존 하행 델타 + `newWatermark` + **모바일 델타 커서 ack**를 응답으로 반환한다.
- **ack 원칙**: 성공 응답을 받았을 때만 `lastAckedRevision` 전진. 실패·타임아웃 시 로컬 리비전은 그대로 → 변경분은 다음 시도에 재전송. LWW+클록 병합이 중복 전송을 멱등 처리한다.
- 프로토콜 하위 호환: 상행 필드가 없는 요청은 기존 동작 유지. 요청 필드 유무로 자연 협상(별도 버전 핸드셰이크 없음).

### 2. 트리거 강화

- **변경 기반 트리거**: 로컬 변경(캡처/메시지/복습/피드백 쓰기) 후 디바운스 2초로 동기화 시도. `sync_data_revision` 변경 감지로 구현.
- **적응형 폴링**: 응답 요약이 "변화 없음"이면 폴링 간격 60초→5분 지수 백오프, 변화 있으면 60초 복귀. (기존 60초 고정 폴링 대체, 서버 부담·배터리 절감)
- resume·앱 활성화 트리거는 기존 유지.

### 3. 전체 스냅샷: 안전망으로 강등

- 10분 전체 스냅샷을 **30분 주기 화해(reconciliation)** 로 격하 — 백그라운드에서 조용히 누적 드리프트 흡수.
- 상행 델타 경로가 불안정하면 전체 스냅샷이 여전히 데이터를 전달하므로, 격하가 즉시 위험을 만들지 않는다.

## 안전 설계 (4대 제약 대응)

### 무손실
- ack 기반 리비전 전진 — 전송 실패가 곧 데이터 유실이 아님.
- 기존 병합 안전장치 유지: 24h 클록 스큐 시 결정적 JSON 순서 병합(`prefer_candidate`), 톰스톤 30일 grace, 미래 타임스탬프 클램프.
- 델타 페이로드 크기 한도(10MB) 초과 시 조용히 전체 스냅샷 경로로 폴백 — 대량 변경 유실 방지.

### 장애 복구
- **사전 동기화 백업**: 서버가 `apply_delta`/`merge_data` 직전 DB 파일을 app-data `backups/pre-sync/`에 복사, 최대 5개 롤링 보관.
- 백업은 동기화 성공 여부와 무관하게 항상 생성. 병합 중 크래시·전원 손실·디스크 오류 시 파일 레벨 복구점 제공.
- 병합은 기존대로 SQLite 트랜잭션 내 수행(`BEGIN IMMEDIATE`).

### 보안
- 상행 델타는 기존 `/v1/sync` 엔드포인트 + 기기별 Bearer 토큰 재사용 — 신규 공격면 없음.
- 페이로드 gzip 유지, 델타 크기 한도로 비정상 요청 조기 거절.
- 키·자격증명은 계속 스냅샷 밖(플랫폼 시큐어 스토어).

### 사용성 무방해
- 모든 동기화 I/O 비동기, UI 스레드 차단 없음.
- 실패는 조용한 재시도+백오프, 오류 배너 없음 — 설정 화면 "마지막 동기화" 표시만 갱신.
- 폴링 백오프 도입으로 기존보다 평시 부하 감소.

## 컴포넌트 변경 범위

| 컴포넌트 | 변경 |
|---|---|
| `apps/mobile/src/features/sync/sync-client.ts` | 상행 페이로드 첨부 + ack 처리 + 디바운스/백오프 상태 머신 (얇게 유지) |
| `apps/mobile/src/features/sync/useAutoSync.ts` | 변경 감지 트리거 + 적응형 간격 |
| `apps/desktop/src-tauri/src/sync/server.rs` | 요청 파싱에 상행 델타 필드(옵셔널) + ack 계산 + 사전 백업 훅 |
| `packages/bridge-rust` / `packages/core-rust` | `export_delta`/`apply_delta` 재사용 — 커맨드 시그니처 확장만, 병합 로직 변경 없음 |
| 옵트인 여부 | 페어링된 기기면 자동 적용 |

## 테스트

- **Rust 단위**: 상행 apply→ack 일관성, 중복 전송 멱등성, 백업 생성/롤링, 클록 스큐·톰스톤 회귀 테스트 유지.
- **bun 단위**: ack 전진(실패 시 전진 없음), 디바운스/백오프 상태 머신, 크기 한도 폴백.
- **기존 게이트 전부 유지**: `expectContractCurrent`, `cargo test`, `bun test`, `bun run lint`, 데스크톱 e2e.
- **시뮬레이터 E2E 게이트**: 위 완료 기준 1~5 수동 검증 (기존 `docs/desktop-mobile-sync.md` 수동 검증 절차 재사용).
- 명시적 범위 외: Android 실기기 검증, OS 백그라운드 태스크 실기기 검증(기존 잔여 과제 유지).

## 잔여·후속 과제 (이번 설계 범위 밖)

- 데스크톱 캡처 동선 강화(전역 단축키·트레이·스크린샷) — 후속 설계 후보.
- 모바일 그래프 뷰(recommendation 데이터 렌더링) — 후속 설계 후보.
- 리마인더 설정 동기화 — 설정 도메인이 스냅샷 밖이므로 별도 설계 필요.
