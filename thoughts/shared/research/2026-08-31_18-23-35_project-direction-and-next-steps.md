---
date: 2026-08-31T18:23:35+09:00
researcher: Claude
git_commit: 530eab7b273a16f986715ad76a4769b361c6aa73
branch: main
repository: Glimpse
topic: "프로젝트 방향성과 지금 더 발전해야 하는 것들 전수 파악"
tags: [research, codebase, roadmap, phase-e, manual-gates, ci, deployment, mobile-gaps]
status: complete
last_updated: 2026-08-31
last_updated_by: Claude
---

# 리서치: 프로젝트 방향성과 지금 더 발전해야 하는 것들

**날짜**: 2026-08-31 18:23 (KST)
**연구자**: Claude
**Git Commit**: 530eab7 (main, origin 대비 2커밋 미push)
**Branch**: main
**Repository**: Glimpse

## 연구 질문

현재 무엇을 더 해야 발전이 될 수 있을까? 프로젝트의 방향성과 지금 더 발전해야 하는 것들을 전부 확인한다.

## 요약

Glimpse는 "형식 선택 없이 저장하면 근거 있는 연결을 지속 갱신하고 발견·탐색하게 하는
개인 지식 도구"라는 방향으로 수렴 중이며, 그 중심 프로그램인 Living Knowledge Graph의
Phase A~D는 완료, Phase E(데스크톱 전역 캡처·트레이)는 **코드 완료·검증 증거만 잔여**
상태다. 코드 레벨 미완성은 사실상 0이고, 남은 발전 과제는 5유형으로 수렴한다:

1. **[긴급] CI 6연속 실패 복구** — `@tauri-apps/api` 2.10.1 upgrade로 제거된
   `transformCallback` export를 테스트 mock이 참조해 JS 테스트·desktop-smoke가 폭발.
2. **Living Graph 프로그램 마감** — Phase E Task 4(패키지 런타임 증거·검증 문서),
   Phase C 네이티브 창 수동 검증, 마스터 설계 상태 표기 갱신.
3. **검증 게이트 실행(사용자 몫)** — 실기기 알림·BGTask·OCR·Shortcuts, EAS 자격증명,
   스토어 제출. 수동 게이트 문서에 명령·기대 결과 기록 보강 필요.
4. **배포 인프라 구축** — "LLM 포함 + 업데이터 서명" release 빌드 경로 부재,
   dmg/msi CI 검증 제로, 버전 3원 불일치(0.1.0/0.1.0/1.0.0), 태그 0개.
5. **후속 제품 기능 후보** — 채팅 임베딩 RAG, 카메라 캡처, Shortcuts 이미지,
   Android 알림 권한·OCR confidence 두 잠재 결함.

## 상세 분석

### 1. 프로젝트 방향성 (문서가 선언한 것)

- 제품 목표: 매일 부담 없이 기록·재검색 → 새 연결 발견 → 연결 따라 탐색 →
  로컬 우선·증분·멀티플랫폼 기술 증거 순의 우선순위
  (`docs/plans/2026-08-31-living-knowledge-graph-design.md:25-34`).
- 그래프는 장식 화면이 아니라 캡처·라벨링·검색·추천·복습·동기화를 연결하는
  **제품의 중심 읽기 모델** (`동 문서 :36-38`).
- 아키텍처: 모바일(Expo)·데스크톱(Tauri)이 공유 Rust 코어 + rustra 브리지를 사용
  (`README.md:40-63`). 외부 텔레메트리·클라우드 계정 전제 처리는 명시적 비범위
  (`living-knowledge-graph-design.md:288-295`).

### 2. Living Graph 프로그램 현황

| Phase | 상태 | 근거 |
|---|---|---|
| A 현재 그래프 마감 | 완료 | 설계 `:10` |
| B Living Graph 기반 | 완료 | `2026-08-31_living-graph-phase-b-verification.md` |
| C 발견·탐색 UX | 구현+자동 검증 완료, **네이티브 창 수동 검증 잔여** | `phase-c-verification.md:83-84` |
| D 품질·기술 증거 | 완료 (receipt 재현 증거 포함) | `phase-d-verification.md:22-56` |
| E 데스크톱 캡처 동선 | **코드 완료(6232f1e·530eab7), Task 4 미착수** | Phase E 조사 보고 |

Phase E 세부:
- Task 1(Rust shell: 전역 단축키 `CmdOrCtrl+Shift+K`, 트레이 4메뉴, 창 닫기→hide,
  종료는 트레이만) 완료 — `apps/desktop/src-tauri/src/shell.rs:13-130`.
- Task 2(프런트 navigation adapter, `capture|graph` 게이트) 완료 —
  `apps/desktop/src/features/shell/desktop-shell-navigation.ts:14-26`.
- Task 3(캡처→그래프 자동 반영 E2E, watermark 중복 방지) 완료 —
  `apps/desktop/e2e/shell-capture-verify.ts`.
- Task 4(전체 게이트 실행 + 패키지 앱 실측 + 검증 문서) 미착수. 검증 문서
  `2026-08-31_living-graph-phase-e-verification.md` 부재.
- **uncommitted diff 2건**(`tauri.conf.json` macOS 번들 아이콘+ad-hoc 서명,
  `tests/shell_contract.rs` 계약 테스트)은 Task 4의 패키지 빌드를 가능케 하는 사전
  수리 — 커밋 필요.

### 3. 검증 게이트 잔여 (사람 손)

단일 집합은 `thoughts/shared/research/2026-08-31_remaining-manual-gates.md`의 11항목:

- Android 실기기: OCR 권한+한국어 스크린샷, BGTask 백그라운드 상행 델타
- iOS 실기기: 알림 권한+21:00 리마인더 발화, BGTask 상행 델타, Shortcuts 한국어 Siri
- 계정: EAS 자격증명, production signing+스토어 제출, 공개 privacy/support URL,
  2026-09-21 전이 취약점 예외 재검토
- 데스크톱: OS 알림 권한+리마인더 발화, 전역 단축키·트레이(Phase E로 활성화됨)

문서 드리프트 11건 확인 (조사 보고 D1~D11). 주요 것:
- **D1**: Phase E 상태 3중 불일치(설계 "진행 예정" vs 플랜 "구현 중" vs 코드 2커밋).
- **D3**: 수동 게이트 문서에 명령·기대 결과·담당자 누락 — 두 마스터 설계가 요구하는
  기록 수준(`living-knowledge-graph-design.md:276`) 미충족.
- **D4**: 08-30 두 플랜의 세션 종료 GUI 체크리스트 9항목이 08-31 정합화에서 누락
  (`2026-08-30-graph-capture-infra.md:589-600`,
  `2026-08-30-apply-loop.md:1126-1134`).
- **D5**: delta-sync 시뮬레이터 수동 E2E 6항목의 소화 기록 부재
  (`2026-08-29-bidirectional-delta-sync.md:615-621`).

### 4. 모바일 기능 완성도

라우트 10개 전부 실구현, 빈 화면·플레이스홀더 없음. TODO/FIXME 실질 0건.

구현 완료: 온디바이스 OCR(iOS Vision ko/en + Android ML Kit 한국어), iOS Share
Extension(direct save+멱등 흡수), Shortcuts 텍스트 캡처(App Intents), 복습 리마인더
(DAILY 트리거+Android 채널), 양방향 델타 동기화(watermark+ack 커서+30분 정합화),
mDNS 페어링(iOS dnssd/Android NSD), BGTask 15분 동기화+60분 라벨링, BYOK 3계열,
로컬 LLM(llama.rn, 데스크톱은 llama.cpp), Apple Intelligence 메타데이터(iOS 26+).

잔여 갭 (대부분 명시적 릴리스 범위 제외):
- **잠재 결함 후보 2건**: (1) Android 13+ `POST_NOTIFICATIONS` — `app.json` plugins에
  `expo-notifications` 엔트리 없음(`apps/mobile/app.json:63-109`), AndroidManifest에도
  명시 없음 → 권한 프롬프트 미발생 가능. (2) Android OCR이 confidence를 항상 1.0 보고
  (`modules/ocr/android/.../OcrModule.kt:31-35`).
- 채팅 RAG가 토큰 매칭 휴리스틱(`src/features/ai/chat-context.ts:21-33`) — 임베딩
  의미 검색은 라이브러리 리랭크에만 적용, 채팅 컨텍스트엔 미적용.
- 카메라 촬영 캡처 UI 없음(갤러리만, `UnifiedCaptureForm.tsx:60-83` —
  `NSCameraUsageDescription`은 선존재).
- Shortcuts는 텍스트 전용(`CaptureQuickNoteIntent.swift:14`), 다이제스트 탭은
  "주간 요약"이 아니라 연결 추천 피드(`app/(tabs)/digest.tsx`).
- Apple Intelligence·rules·stub 타깃은 채팅 생성 불가(명시적 에러,
  `useChatAISetup.ts:60`).

### 5. 데스크톱 완성도와 CI·배포

- 라우트 10개 전부 실구현(보관함/캡처/상세/채팅/다이제스트/그래프/복습/설정),
  플레이스홀더 없음. Rust 셸에 LLM 12커맨드·keyring 3·mdns 4·트레이·단축키 배선.
- **CI 심각**: 최근 10회 중 성공 2회. 원인은 `@tauri-apps/api` 2.10.1에서 제거된
  `transformCallback` export를 테스트 mock이 참조(`e2e/e2e-smoke.ts:28,49` 등) —
  락 업그레이드 후 6연속 실패. `audit-high` 주간 실패는 계획된 항목.
- **데스크톱 배포 빈틈**: macOS dmg/Windows msi는 CI 검증 제로(주간 job은 deb만).
  `tauri.conf.json` updater `pubkey: ""`, `endpoints: []`. macOS는 ad-hoc 서명(공증
  없음). "LLM feature + 업데이터 서명 아티팩트"를 동시에 만드는 빌드 명령이 없음
  (`tauri:build:release`는 `--features llm` 없음, `tauri:build:llm`은 updater
  오버레이 미결합).
- **릴리스 제도 부재**: git 태그 0개, CHANGELOG에 버전 절 없음(Unreleased만),
  버전 불일치(desktop 0.1.0 / mobile 1.0.0), 자동 bump·태깅 워크플로 없음.

## 코드 참조

- `docs/plans/2026-08-31-living-knowledge-graph-design.md:14` — Phase E "진행 예정"
  표기(드리프트, 코드는 커밋됨)
- `apps/desktop/src-tauri/src/shell.rs:13-130` — Phase E Rust shell 전체
- `apps/desktop/src-tauri/tests/shell_contract.rs:43-59` — uncommitted macOS 번들
  계약 테스트
- `apps/desktop/e2e/e2e-smoke.ts:28,49` — CI 실패의 `transformCallback` 참조 지점
- `apps/mobile/app.json:63-109` — expo-notifications 플러그인 엔트리 부재 구간
- `apps/mobile/src/features/ai/chat-context.ts:21-33` — 토큰 매칭 채팅 RAG
- `thoughts/shared/research/2026-08-31_remaining-manual-gates.md:22-50` — 수동
  게이트 11항목

## 아키텍처 인사이트

- 이 저장소의 미완료 관리는 TODO 주석이 아니라 **플랜 문서의 잔여 섹션 + thoughts
  검증 문서**로 이루어진다. 따라서 발전 관리의 최우선 도구는 코드가 아니라 문서
  정합성이며, 현재 Phase E 표기와 08-30 체크리스트 이관 누락이 그 드리프트다.
- 검증 전략은 "헤드리스 E2E 우선"(`sync:e2e`, Playwright+IPC 스텁)으로 확립돼 있고,
  남은 수동 검증은 OS 권한·실기기·물리 키 입력뿐이다.
- 제품 기능 자체는 두 플랫폼 모두 "제품으로서 최소 완전" 상태. 다음 성장 축은
  (i) 신뢰(검증·배포 인프라) 또는 (ii) 기능 심화(임베딩 RAG, 캡처 채널 확장)
  중에서 선택해야 한다.

## 히스토리 컨텍스트 (thoughts/ 디렉터리)

- `thoughts/shared/research/2026-08-30_20-46-17_remaining-development-tasks.md` —
  전일 남은 과제 유형화(검증 게이트·브랜치·배포·후속 설계). 이후 그래프·캡처
  로드맵으로 대부분 소화됨.
- `thoughts/shared/research/2026-08-30_22-49-26_full-consistency-audit.md` — P0·P1
  감사(전량 수리 완료).
- `thoughts/shared/research/2026-08-31_living-graph-phase-{b,c,d}-verification.md` —
  Phase별 검증 증거(Phase E만 부재).

## 관련 리서치

- `thoughts/shared/research/2026-08-31_remaining-manual-gates.md`
- `thoughts/shared/research/2026-08-30_20-46-17_remaining-development-tasks.md`

## 미해결 질문

- 다음 스프린트의 축: "배포·신뢰"(CI 복구→Phase E 마감→릴리스 제도)와 "기능 심화"
  (임베딩 RAG 등) 중 어느 쪽을 먼저 할지 — 사용자 결정 필요.
- Android 실기기 점유 해제 시점(사용자 사정으로 보류 중).
- 공개 privacy/support URL과 업데이터 엔드포인트 호스팅 위치.

## Follow-up Research [2026-08-31 18:23 → 19:00 KST — CI 근본 원인 확정·수리]

1번 과제(CI 6연속 실패)의 근본 원인 2건을 확정하고 수리했다:

1. **Android 링크 실패**: `glimpse_jni_init`(32979f2 도입)에 `#[unsafe(no_mangle)]`
   누락. `extern "C"`만으로는 staticlib 심볼이 legacy mangling(`_RNv…`)되어 C++
   트램폴린 링크가 실패. 수리 597f822 — `cargo ndk` 재빌드 후
   `T glimpse_jni_init` 비맹글링 심볼 확인, 호스트 테스트(clippy 포함) 그린.
2. **JS 4 fail + unhandled error**: bun `mock.module`의 프로세스 전역성 + 3개 테스트
   (`byok-provider`, `settings-storage`, `desktop-llm-service`)의 부분 core mock.
   `@tauri-apps/api/event` 2.10.x가 `transformCallback`을 core.js에서 정적 import
   하므로, 부분 mock 등록 뒤 로드되는 진짜 event.js가 `SyntaxError`로 폭발
   (`bun -e`로 재현 확증). 수리 d5f9942 — 공용 `tauri-core-mock.ts` 팩토리로
   완전 mock 교체 + 오염 회귀 테스트 신설.
3. 문서 정합화 0fa15d6 — 수동 게이트 미이관 16건을
   `remaining-manual-gates.md` "이관 분"으로 통합, 5개 원 플랜 문서에 이관 각인.
4. 병렬 세션이 Phase E 마감(c94e581 macOS Reopen 복원·번들 서명, 1aa7182 검증
   문서·설계 갱신)을 완료 — D1/D2 드리프트 해소됨.

잔여: push 후 CI 그린 확인(Task 6, 사용자 확인 필요), `libglimpse_bridge.a`
재생성 커밋(실기기 검증 전제), ④ 배포 인프라(릴리스 제도화), ⑤ 기능 심화.
