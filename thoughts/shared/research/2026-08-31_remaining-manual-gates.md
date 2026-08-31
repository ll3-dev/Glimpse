---
date: 2026-08-31
researcher: Claude
git_commit: 3465ddd
branch: main
repository: Glimpse
topic: "잔여 수동 게이트 — 사용자 실기기·계정·GUI 확인 항목"
tags: [research, manual-gates, verification, device, eas]
status: complete
last_updated: 2026-08-31
last_updated_by: Claude
---

# 잔여 수동 게이트 (2026-08-31)

**근거**: Phase 1 게이트 소화(`docs/plans/2026-08-31-phase1-gates.md`). 자동 게이트는
전부 그린(lint·typecheck·646 JS 테스트·157 Rust 테스트·clippy·tauri check·sync:e2e)임이
확인됐고, 이 문서는 **사람 손이 필요한** 잔여 항목만 모은다. 코드 레벨 미완성은 없다.

## Android 실기기

- [ ] OCR 이미지 피커 권한 허용 후 한국어 스크린샷 → 본문 자동 삽입 확인
      (08-16 플랜 OCR 3항목; 사진 피커 권한이 실기기 전제)
- [ ] BGTaskScheduler/WorkManager 백그라운드 상행 델타 — 앱 백그라운드 진입 후
      데스크톱에서 변경 수신 확인
      (`docs/plans/2026-08-29-bidirectional-delta-sync.md:632`)

## iOS 실기기

- [ ] 알림 권한 프롬프트 수락 + 21:00 리마인더 실제 발화
      (시뮬레이터는 권한 프롬프트·정시 발화 신뢰도 낮음; `2026-08-28-core-loop-completion.md`)
- [ ] BGTaskScheduler 상행 델타 (양방향 델타 동기화 플랜 실기기 잔여)
- [ ] Shortcuts 앱 목록 노출 + 한국어 Siri 트리거
      (개발 언어 en — 한국어 트리거는 실기기 언어 설정 필요)
- [ ] iPhone 양방향 동기화 재확인은 완료됨(30706e9, 2026-08-29) — 재검증 불필요

## 계정·배포 (사용자 계정 필요)

- [ ] EAS 자격증명 구성 (Apple/Google 계정, `eas credentials`)
- [ ] Apple/Google production signing + 스토어 제출
      (`docs/plans/2026-08-21-gap-remediation-plan.md:222-260`)
- [ ] 공개 privacy/support URL 확정
- [ ] 📅 **2026-09-21 전이 취약점 예외 재검토** (달력 이벤트 성격 — 날짜 박힘)

## 데스크톱 GUI

- [ ] OS 알림 권한 + 데스크톱 리마인더 발화
      (in-process 재시작 시 소실은 문서화된 설계 한계)
- [ ] Phase 3 구현 후: 전역 단축키(CmdOrCtrl+Shift+K)·트레이 메뉴 동작
      (`docs/plans/2026-08-31-roadmap-gates-graph-capture-design.md` Phase 3)

## 시뮬레이터/헤드리스로 불가한 것 (참고)

- 권한 프롬프트, 로컬 알림 정시 발화, Siri/Shortcuts 실동작,
  실기기 백그라운드 태스크(BGTaskScheduler/WorkManager), 스토어 서명·제출

---

## 이관 분 (2026-08-31 정합화 — 구형 플랜 문서에서 미이관됐던 항목)

이 섹션이 이 항목들의 유일한 진행 추적 위치다. 원 플랜 문서의 체크리스트는
스냅샷으로 남기고 이관 각인을 추가했다.

### 08-30 graph-capture-infra GUI 4항목 (원 위치: `2026-08-30-graph-capture-infra.md:589`)

- [ ] ShareExtension: 사파리 공유 → 저장 → 라이브러리 표시
- [ ] 데스크톱 그래프: 증분 실행 후 엣지 생성·노드 클릭 하이라이트
      (Playwright+IPC 스텁 자동 검증은 `phase-c-verification.md:60-80` —
      네이티브 창 실측은 이 항목이 담당)
- [ ] 모바일 상세: 연결된 노트 섹션 표시·탭 이동
- [ ] 시뮬레이터: LLM 스트리밍 정상 (B2 브리지 변경 회귀)

### 08-30 apply-loop GUI 3항목 (원 위치: `2026-08-30-apply-loop.md:1126`)

- [ ] GUI: 채팅 참조 칩 표시
- [ ] GUI: digest 최근 연결 섹션
- [ ] GUI: Shortcuts 흡수 (Debug 빌드에서 Shortcuts 앱 목록 노출 포함)

### 08-29 delta-sync 시뮬레이터 수동 E2E 6항목 (원 위치: `2026-08-29-bidirectional-delta-sync.md:615`)

- [ ] `bun run desktop:dev` + `bun run ios` 양쪽 기동, 데스크톱 페어링 코드로 모바일 페어링
- [ ] 모바일 캡처 → 데스크톱 라이브러리 수 초 내 표시
- [ ] 모바일 채팅 전송 → 데스크톱 채팅 목록 반영
- [ ] 어느 쪽 복습 완료 → 양쪽 스케줄 일치
- [ ] 동기화 직후 데스크톱 강제 종료 → 재시작 시 데이터 이상 없음 + `backups/pre-sync/` 존재
- [ ] 네트워크 단절(와이파이 off) 중 모바일 캡처 → 복구 후 자동 전파

### 08-28 core-loop 알림 세부 4항목 (원 위치: `2026-08-28-core-loop-completion-design.md:128-132`)

- [ ] iOS/Android: 리마인더 설정 변경(시각·토글) 변경 즉시 반영
- [ ] iOS/Android: 백그라운드 복귀 시 재스케줄 (due 개수 갱신)
- [ ] 데스크톱: 24시간 이상 상시 실행에서 일일 재발화 (타이머 재무장)
- [ ] 백필: 라벨링 활성화 이전 데이터가 있는 DB에서 시작 → pending 전환 → 라벨링 큐 소화
      (시뮬레이터+로컬 DB 준비로 가능할 수 있음)

### 08-21 gap-remediation 배포 1항목 (원 위치: `2026-08-21-gap-remediation-plan.md:266`)

- [ ] Tauri updater 공개 HTTPS endpoint 확정 + 서명 키 발급
      (`prepare-release-config.ts`의 3개 환경변수 실값 주입)

### Phase E 패키지 런타임 2항목 (상세: `2026-08-31_living-graph-phase-e-verification.md:74-81`)

- [ ] macOS: 다른 앱 전면 상태에서 `Cmd+Shift+K` → 창 복원 + `/capture` 진입
- [ ] macOS: 메뉴 막대 트레이에서 빠른 캡처·지식 그래프·종료 실측

### Android bridge 재생성 전제 (Task 1 후속, 2026-08-31)

- 전제: 커밋된 `apps/mobile/android/glimpse-core/libs/arm64-v8a/libglimpse_bridge.a`는
  `glimpse_jni_init`의 `no_mangle` 수리(597f822) 이전 빌드라 심볼이 없다.
  Android 실기기 검증 전 `bun run --cwd apps/mobile build:bridge:android`로
  재생성·커밋할 것.

## 이관 항목 완료 기준

각 항목은 (1) 수행 일자, (2) 증거(스크린샷 경로 또는 관찰 기록), (3) 재현 명령을
함께 기록해 `[x]`로 전환한다. 전 항목 완료 전에 전체 프로그램 완료를 주장하지 않는다.
