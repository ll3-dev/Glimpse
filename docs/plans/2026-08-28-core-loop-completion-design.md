# 핵심 루프 완성 설계 (복습 리마인더 · 라벨링 백필 · AI 미설정 경험)

- 날짜: 2026-08-28
- 기준: `main@b6d5378`
- 방향: 사용자 임팩트 우선 — 제품의 핵심 약속("적절한 타이밍에 다시 꺼내주기")을 실제로 작동하게 만든다
- 배경 조사: TODO/FIXME 사실상 0건, CI 그린, 653 JS + 72 Rust 테스트 통과 상태. 남은 것은 "채울 것"이다.

## 배경 (조사 요약)

1. **복습 알림 부재** — FSRS-lite 복습 큐는 완성돼 있지만 사용자를 다시 불러내는 알림 시스템이 코드베이스에 전혀 없다(grep 0건). 복습은 사용자가 먼저 앱을 열어야만 작동한다.
2. **라벨링 백필 부재** — 저장 시 `labelStatus: 'pending'`이 설정되고(`packages/features/src/capture/save.ts:69`) 큐는 `WHERE label_status = 'pending'`으로만 조회(`packages/core-rust/src/storage/sqlite/knowledge.rs:182`)하는데, 라벨링 파이프라인 활성화 이전에 저장된 항목은 `labelStatus: null`이라 영구 미라벨 상태. 검색·다이제스트 품질 저하.
3. **AI 미설정 경험** — 라벨링은 규칙 기반 폴백이 있어(`apps/mobile/src/features/ai/targets/registry.ts:126-129`) 실제로 노출되는 스텁 품질은 요약(첫 100자 절단)과 미설정 무표시다. 더 나은 AI를 연결할 기회를 계속 놓친다.

## 공통 아키텍처 원칙

모든 3개 기능은 **공유 코어(`packages/features`, `packages/hooks`) + 얇은 플랫폼 어댑터(모바일/데스크톱)** 구조를 따른다. 이는 `create-rustra-core-client` 패턴(공유 팩토리 + 양앱 씬 래퍼)의 재적용이다.

---

## 섹션 1. 복습 리마인더 알림 (크로스플랫폼)

**결정**: 푸시 서버 없이 **로컬 알림만** 사용(프라이버시 포지셔닝 일치, 외부 자격증명 불필요). 알림 단위는 항목별 발화가 OS 대기 알림 한도(64개)·소음 문제가 있으므로 **하루 1회 요약형**("복습할 항목 N개가 기다리고 있어요")으로 한다. 기본 발화 시각 21:00, 설정에서 변경 가능.

### 공유 코어 — `packages/features/src/review-reminder/` (신규)

- `types.ts` — `ReviewReminderScheduler` 포트: `requestPermission() / scheduleDaily({hour, minute}) / cancel() / getStatus()`
- `schedule.ts` — 순수 로직: 다음 발화 시각 계산, 재스케줄 필요 여부 판정(idempotent)
- `message.ts` — 로캘(ko/en) 메시지 빌더
- `createReviewReminderController.ts` — 포트 주입 컨트롤러: due 개수 조회(코어 클라이언트 `getDueKnowledgeItems`) → 스케줄/재스케줄/취소 오케스트레이션
- `packages/hooks` — `useReviewReminderScheduler` 공유 훅(어댑터 주입)

### 플랫폼 어댑터 (씬 래퍼)

- 모바일: `apps/mobile/src/features/notifications/` — `expo-notifications` 어댑터, 일일 트리거 1개 유지
- 데스크톱: Tauri notification 플러그인 어댑터(`@tauri-apps/plugin-notification` + Cargo 플러그인/capability). 데스크톱은 상시 실행이므로 발화 시점에 due 개수 실시간 계산해 정확한 N 발화

### 정확한 N의 한계

로컬 알림 내용은 스케줄 시점에 고정된다. 따라서 **앱 포그라운드 전환·복습 mutation 성공 시 다음 발화분을 현재 due 개수로 재스케줄**해 근사한다. 앱을 안 연 사이에는 마지막 확인 개수가 표시된다(데스크톱은 상시 실행이라 항상 정확).

### 설정 UI

양앱 설정 화면에 "복습 알림" 섹션(토글 + 시간 선택, 기본 21:00). 권한 거부 시 토글 비활성 + 안내. 웹은 플랫폼 가드로 기능 스킵.

### 오류 처리

권한 거부·스케줄 실패는 조용히 로그만 남기고 앱 동작 무영향(fail-safe).

---

## 섹션 2. 라벨링 백필

**원칙**: 새 파이프라인을 만들지 않고 기존 큐에 편입시킨다. 브리지에 전체 목록 조회(`list_knowledge_items`)가 이미 있어 새 Rust 커맨드가 불필요하다.

### 공유 로직 — `packages/features/src/labeling/backfill.ts` (신규)

1. `listKnowledgeItems()` 전체 조회 → `labelStatus == null` && 본문 텍스트가 비어있지 않은 항목 선별
2. 각 항목을 `labelStatus: 'pending'` + `labelRequestedAt`으로 업데이트
3. 이후 처리는 **기존 포그라운드/백그라운드 라벨링 큐가 자동으로** limit=1 씩 점진 소화 — 배터리 스파이크·중복 실행 걱정 없음, AI 타겟 해상 로직도 기존 그대로

### 실행 지점

양앱 시작 시 1회. 설정 플래그(`labelingBackfillCompleted`)로 재실행 방지하고 버전 필드(`backfillVersion`)를 두어 재백필 필요 시 버전 상향만으로 재실행.

### 공유 훅

`packages/hooks` — `useLabelingBackfill()`(코어 클라이언트 + 완료 플래그 저장소 주입). 모바일 `_layout.tsx`와 데스크톱 앱 셸에서 어댑터와 함께 호출.

### 오류 처리

마킹 실패 시 플래그를 남기지 않아 다음 시작에 재시도. 개별 항목 실패는 건너뛰고 계속, 결과는 로그. 라벨러가 처리 불가한 항목(빈 본문 등)은 선별 단계에서 제외.

---

## 섹션 3. AI 미설정 경험 정리

라벨링엔 규칙 폴백이 이미 있으므로 두 가지 소극적 개선만 한다(YAGNI).

### 1. 스텁 요약 품질 향상

`packages/features/src/capture/summary-preview.ts` (신규, 공유로 양앱 적용):

- 첫 100자 절단 대신 **첫 완결 문장(또는 첫 줄) 추출**, 너무 길면 140자에서 문장 경계로 절단
- 기존 `generateSummaryStub`(`apps/mobile/src/features/capture/stubs.ts`)을 이 함수로 교체
- 결정적·순수 함수

### 2. AI 미설정 안내 (노이즈 최소화)

- 설정 화면에 **"AI 상태" 행**: 현재 유효 타겟 표시("기본 자동 정리 (미리보기 품질)" vs "Apple Intelligence" 등) — 기존 설정 카탈로그 패턴 재사용
- 캡처가 스텁 타겟으로 저장될 때 **토스트 1회**("지금은 미리보기 품질로 저장돼요 — 설정에서 Apple Intelligence/BYOK/로컬 모델을 연결할 수 있어요"), store 플래그로 세션당 최대 1회. 모달·배너 없음

### 오류 처리

순수 함수 + 조건부 UI라 실패 경로 없음. 타겟 해상은 기존 `resolveEffectiveTarget` 사용.

---

## 테스트 전략

- **섹션 1**: 발화 시각 계산·재스케줄 판정·권한 거부 경로 유닛 테스트. 실제 발화는 실기기 수동 확인 항목으로 기록
- **섹션 2**: 선별 규칙(null/빈본문/이미 완료), 플래그 재실행 방지, 부분 실패 시 계속 진행 유닛 테스트
- **섹션 3**: 문장 추출(한글/영문/마크다운/빈 본문), 토스트 세션 캡 로직 유닛 테스트
- 게이트: `bun run lint`, `bun test`, 양앱 typecheck, 스모크 실행

## 명시적 범위 제외 (YAGNI)

- 푸시 서버/APNs/FCM — 로컬 알림만
- 항목별 정시 알림 — 하루 1회 요약형으로 충분
- 배치 라벨링 파이프라인 — 기존 큐 점진 소화 재사용
- 스텁 타겟 제거 — "기본 자동 정리"라는 정직한 이름으로 유지, 안내만 추가
