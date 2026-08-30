---
date: 2026-08-30T20:46:17+09:00
researcher: Claude
git_commit: 32979f2f92d87b56432c569a171a6715a389dd55
branch: main
repository: Glimpse
topic: "현재 남은 개발 과제 파악 — 미push 커밋·미완료 플랜 문서·TODO·메모리 잔여 항목 대조"
tags: [research, codebase, plans, backlog, gui-verification, device-verification, sync]
status: complete
last_updated: 2026-08-30
last_updated_by: Claude
---

# 리서치: 현재 남은 개발 과제

**날짜**: 2026-08-30 20:46 (KST)
**연구자**: Claude
**Git Commit**: 32979f2 (main)
**Branch**: main
**Repository**: Glimpse

## 연구 질문

현재 더 개발해야 하는 것들이 무엇이 있는가? — 미push 커밋, 미완료 플랜 문서, TODO/FIXME, 세션 메모리의 잔여 항목을 대조.

## 요약

코드 레벨의 미완성 작업은 사실상 없다 (TODO/FIXME 마커가 소스에 실질 0건 — 남은 것은 의도된 웹 스텁·폴백 제공자뿐). 남은 과제는 거의 전부 **(1) 검증 게이트**(GUI 수동·실기기), **(2) 브랜치 정리**(main 16커밋 + feat/apply-loop 16커밋 모두 미push), **(3) 배포 인프라**(EAS 자격증명), **(4) 후속 설계 후보**(데스크톱 캡처 동선, 모바일 그래프 뷰 등)로 유형화된다. 가장 시급한 것은 ① 두 플랜(그래프·캡처 / 활용 루프)의 세션 종료 GUI 체크리스트 9항목과 ② `feat/apply-loop` 병합 + 전체 push다.

## 상세 분석

### 1. 브랜치/git 상태 (가장 먼저 처리 필요)

- `main`이 origin/main보다 **16커밋** 앞섬 (3406043 설계 → 32979f2 Android JNI). 그래프·캡처·인프라 플랜 전 태스크 완료 상태.
- `feat/apply-loop` 워크트리(`.claude/worktrees/apply-loop`)는 **커밋 완료·작업 트리 깨끗** (75f65b1). main 기반(e9133c3)에서 갈라져 **16커밋**, main에 **미병합·미push**.
- 두 브랜치는 파일 겹침 0으로 설계됨(트랙 A/B vs C) — 병합 충돌 위험 낮음.
- `git branch --merged main` 결과 feat/apply-loop는 미병합.

### 2. 플랜 문서별 미완료 (docs/plans/)

**2026-08-30 그래프·캡처·인프라 플랜** (`docs/plans/2026-08-30-graph-capture-infra.md` L590~600):
- GUI 수동 체크리스트 4건 (전부 미체크): ShareExtension 사파리 공유→저장→라이브러리 표시 / 데스크톱 그래프 증분 실행 후 엣지 생성·노드 클릭 하이라이트 / 모바일 상세 연결된 노트 섹션·탭 이동 / 시뮬레이터 LLM 스트리밍 회귀
- 명시적 범위 외: Android 실기기·BGTaskScheduler 실기기 검증, EAS 자격증명, 모바일 그래프 시각화, 웹 클립버드

**2026-08-30 활용 루프 플랜** (`docs/plans/2026-08-30-apply-loop.md` L1128~1134):
- 세션 종료 게이트 5항목 미체크 (구현은 12태스크 전부 완료): 전체 bun test·lint·typecheck 회귀 확인, GUI(채팅 참조 칩 / digest 최근 연결 / Shortcuts 흡수), 커밋 파일 지정 감사
- GUI 수동 4항목: 채팅 참조 칩 표시, 복습 카드 순서 체감, 엣지 추가 시 섹션 갱신, Shortcuts→intent→앱 흡수 (Debug 빌드에서 Shortcuts 앱 목록 노출 확인 포함)
- 잔여 소액: 한국어 Siri 음성 트리거 미확인(개발 언어 en), 연결도 부스트 동일 ms 타이 버킷팅 결정

**2026-08-29 양방향 델타 동기화** (`docs/plans/2026-08-29-bidirectional-delta-sync(-design).md`):
- 실기기 잔여: OS 백그라운드 태스크(BGTaskScheduler) 상행 델타, Android 실기기
- 후속 설계 후보: 데스크톱 캡처 동선 강화(전역 단축키·트레이·스크린샷), 모바일 그래프 뷰, 리마인더 설정 동기화

**2026-08-28 핵심 루프 완성** (`docs/plans/2026-08-28-core-loop-completion(-design).md`):
- 실기기: iOS/Android 알림 권한 프롬프트·21:00 실제 발화·설정 변경 반영, 데스크톱 OS 알림 권한·일일 재무장
- 백필: 라벨링 활성화 이전 데이터가 있는 실제 DB에서 pending 전환→큐 소화 확인
- 데스크톱 rules-provider 요약 100자 절단, 요약 트렁케이트 surrogate 가드 (소액)

**2026-08-21 갭 보완** (`docs/plans/2026-08-21-gap-remediation-plan.md` L222~260):
- 배포 의존: Apple/Google production signing, 스토어 제출, Apple Intelligence 실기기, 장시간 로컬 모델 thermal/memory smoke, 공개 privacy/support URL
- **2026-09-21 전이 취약점 예외 재검토 예정** (달력 이벤트 성격)

**2026-08-19 rustra 3라운드** (`docs/plans/2026-08-19-round3-implementation.md`):
- rustra PR 생성 권한 설정 (사용자 GitHub 액션)
- Android 실기기: 이미지 선택 피커 권한 허용 후 OCR 추출 확인

**2026-08-16 rustra 통합 플랜** (`docs/plans/2026-08-16-rustra-integration-plan.md` L473~507):
- GUI 검증 체크리스트 16항목 문서상 미체크 (데스크톱 7·모바일 6·스트리밍 3·OCR 3) — 이후 라운드에서 상당 부분 소화됐을 가능성, 문서 갱신 필요

**2월 문서들**: 전부 완료 (02-17 ai-provider-sdk-integration만 헤더 Status Complete인데 체크박스 3개 미갱신 — 문서 정리 대상).

### 3. 세션 메모리 잔여 항목 (교차 대조)

- 공통 반복 잔여: **GUI 수동 검증**, **EAS 자격증명**, **실기기 검증**(iOS 부분 완료 30706e9, Android는 사용자 보류 지시)
- `apply-loop-2026-08-30`: GUI 4항목 + Shortcuts 목록 노출
- `graph-capture-infra-plan-complete`: GUI 4건 + push 미완료
- `device-sync-verification-2026-08-29`: 미확인 작업트리 변경(AIModeSelector 등) → **desktop-titlebar-theme(5784d91)·c7e440a로 커밋·push 완료로 해소됨**
- `bidirectional-sync-2026-08-29`: 데스크톱 캡처 동선·모바일 그래프 뷰 미착수 (후속 설계 후보로 확정 이관)
- `mdns-sync-roadmap-2026-08-28`: Goal 1~3 완료 (32979f2 Android JNI로 B2 트랙 종료)
- 폰 AI 설정 확인 — 사용자가 «나중에 확인해볼게» (사용자 몫)

### 4. 코드 레벨 TODO/스텁 스캔

의미 있는 미구현 마커 없음. 유형화:
- **웹/테스트 스텁** (의도됨): `apps/mobile/src/features/core/rustra-engine.ts:2`, `modules/sync-discovery/src/index.web.ts:14-18`, `modules/ocr/src/index.ts:32-37`
- **폴백 제공자** (의도됨): `apps/mobile/src/features/capture/stubs.ts:4-27`, `src/features/ai/metadata/stub-provider.ts:25`
- **마이그레이션 잔여**: `src/features/core/application/{chat,capture,recommendation,review}/index.ts` 4개 deprecated 배럴 (`@glimpse/features` 이전 완료 후 제거 가능), `src/features/ai/targets/executors.ts:38` deprecated `contextItem`(단수)
- **설계 지연**: `apps/desktop/src/features/ai/router.ts:62` "Metadata and labeling use the same provider for now" — 기능별 provider 분리 미구현
- wire 호환: `apps/desktop/src-tauri/src/sync/server.rs:63,528` deprecated `fingerprint` 필드 (의도적 유지)

## 코드 참조

- `docs/plans/2026-08-30-graph-capture-infra.md:590-600` — GUI 체크리스트 4건·범위 외
- `docs/plans/2026-08-30-apply-loop.md:1128-1134` — 세션 종료 게이트 5항목
- `docs/plans/2026-08-29-bidirectional-delta-sync-design.md:87-90` — 후속 설계 후보 3건
- `docs/plans/2026-08-21-gap-remediation-plan.md:222-260` — 배포 의존·09-21 재검토
- `apps/desktop/src/features/ai/router.ts:62` — provider 분리 지연 주석

## 아키텍처 인사이트

- 이 저장소의 미완료 관리는 TODO 주석이 아니라 **플랜 문서의 "잔여/범위 외" 섹션 + 세션 메모리**로 이루어진다. 코드에는 마커가 없으므로 문서를 진실 소스로 봐야 함.
- 검증 전략이 "헤드리스 E2E 우선"으로 이동함 (`bun run sync:e2e`, `sync_headless_e2e.rs`) — 시뮬레이터 GUI E2E는 더 이상 필수 게이트가 아님. 남은 GUI 검증은 헤드리스가 못 커버하는 시각·OS 통합 영역만.
- 안전 관련 잔여(전이 취약점 예외)는 날짜가 박혀 있음(2026-09-21) — 일반 백로그와 성격이 다름.

## 히스토리 컨텍스트 (thoughts/ 디렉토리)

- `thoughts/shared/research/2026-08-26_15-20-14_next-improvement-opportunities.md` — 개선 기회 발굴 (A1~C4 대부분 소화됨)
- `thoughts/shared/research/2026-08-27_00-24-30_post-execution-audit.md` — P0/P1 감사 (전량 수리 완료)

## 관련 리서치

- `thoughts/shared/research/2026-08-30_20-46-17_remaining-development-tasks.md` (본 문서)

## 미해결 질문

- `feat/apply-loop` 병합 시점과 병합 방식(merge vs rebase) — 파일 겹침 0이라 충돌 위험은 낮음
- 08-16 플랜의 GUI 체크리스트 16항목 중 현재 실제로 미검증인 것의 정밀 대조 (문서만 오래된 가능성)
- Android 실기기 점유 해제 시점 (사용자 사정)
