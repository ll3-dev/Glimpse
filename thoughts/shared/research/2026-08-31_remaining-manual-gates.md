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
