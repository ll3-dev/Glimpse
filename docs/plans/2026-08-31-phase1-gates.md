# Phase 1: 검증·배포 게이트 소화 — 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 자동으로 증명 가능한 검증 게이트를 전부 소화하고, deprecated 배럴 4종 제거, GUI 체크리스트 문서 정합화, iOS 시뮬레이터 자동 검증까지 수행한 뒤 사람 손이 필요한 게이트를 체크리스트 문서로 분리한다.

**Architecture:** 3가지 작업 트랙으로 구성된다. (1) 회귀 게이트 전수 실행 — CI와 동일한 명령 세트를 로컬에서 돌려 현재 헤드가 그린임을 증명한다. (2) 코드 청소 — `apps/mobile/src/features/core/application/` 하위 deprecated 배럴 4종(capture/chat/recommendation/review)을 제거하고 49개 소비 파일의 임포트를 `@glimpse/features`로 기계적 전환한다(배럴이 단순 재수출이므로 안전). `state`·`knowledge` 배럴은 deprecated 마커가 없으므로 건드리지 않는다. (3) 문서 정합화 — 08-16 플랜의 GUI 체크리스트를 이후 라운드에서 실제 소화된 증거(커밋·헤드리스 E2E)와 대조해 갱신하고, 남은 수동 게이트를 신규 문서로 분리한다. iOS 시뮬레이터 기동·스크린샷은 환경이 허용하면 수행, 아니면 수동 목록으로 이관한다.

**Tech Stack:** Bun workspace (`bun test`, `bun run lint/typecheck`), Cargo (`cargo test/clippy/check`), expo/xcodebuild CLI, Markdown.

**설계 근거:** `docs/plans/2026-08-31-roadmap-gates-graph-capture-design.md` Phase 1 섹션.

---

## 사전 지식 (0-컨텍스트 엔지니어용)

- 이 저장소는 Bun 워크스페이스. 루트 `package.json`의 스크립트가 각 앱으로 위임한다:
  `lint`(mobile+desktop), `typecheck`(mobile), `desktop:typecheck`, `test:coverage`.
- CI(`.github/workflows/ci.yml`)의 JS 잡 명령: `bun run lint`, `bun run desktop:lint`,
  `bun run typecheck`, `bun run desktop:typecheck`, `bun run test:coverage`,
  `bun test packages/features/src apps/desktop/src packages/ui --coverage`,
  `bun run web:export`, `bun run audit:critical`.
- CI의 Rust 잡 명령: `cargo test --workspace`, `cargo clippy --workspace --all-targets -- -D warnings`,
  `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`.
- 모바일 전용: `bun run sync:e2e` = `bun scripts/sync-headless-e2e.ts` (cwd: apps/mobile) —
  GUI 없이 양방향 동기화를 검증하는 헤드리스 E2E. Rust 변경이 있으면 재빌드가 필요하다.
- deprecated 배럴 4종은 모두 `/** @deprecated Import new application-layer code from `@glimpse/features`. */`
  헤더와 함께 `@glimpse/features`에서 **이름 그대로** 재수출하는 1:1 프록시다
  (예: `apps/mobile/src/features/core/application/recommendation/index.ts`).
  따라서 임포트 경로를 `@glimpse/features`로 바꾸는 것만으로 동작이 동일하다.
  타입 재수출도 포함되어 있어 `import type` 줄도 같은 경로로 바꾼다.
- 배럴 소비 파일 49개의 분포: `src/features/recommendation` 15, `src/features/review` 10,
  `src/features/chat` 9, `src/features/capture` 5, `src/stores/settings` 3, `src/features/ai` 3,
  `src/features/settings` 2, `src/stores/recommendation` 1, `src/features/library` 1.
  임포트 경로 문자열은 `@/src/features/core/application/<domain>` (따옴표 혼용: '와 ").
- `apps/mobile/src/features/core/application/state/`와 `knowledge/`는 `@deprecated` 마커가
  없는 살아있는 코드다 — **절대 삭제하면 안 된다.**
- GUI 체크리스트 진실 소스: `docs/plans/2026-08-16-rustra-integration-plan.md`의
  "GUI 검증 체크리스트" 섹션(데스크톱 7 + 모바일 6 + 스트리밍 3 + OCR 3 = 19항목).

---

### Task 1: 회귀 게이트 전수 실행 (JS 트랙)

**Files:**
- 수정 없음. 게이트 실행·기록만.

**Step 1: 워크스페이스 설치 상태 확인**

```bash
cd /Users/loopy/dev/ll3/Glimpse && bun install
```
Expected: `Done` (이미 설치돼 있으면 즉시 종료)

**Step 2: JS 게이트 명령 순차 실행**

```bash
bun run lint && bun run typecheck && bun run desktop:lint && bun run desktop:typecheck
```
Expected: 전부 exit 0. 실패 시 실패 명령·출력을 기록하고 Task 1을 중단 → 결과를 사용자에게 보고.

**Step 3: 테스트 게이트**

```bash
bun run test:coverage 2>&1 | tail -5
```
Expected: 모든 테스트 패스. 실패 시 기록.

**Step 4: 커밋 없음 (게이트 기록만)** — 실행 결과(각 명령 exit code)를 메모로 축적한다.

---

### Task 2: 회귀 게이트 전수 실행 (Rust·E2E 트랙)

**Files:**
- 수정 없음.

**Step 1: Rust 게이트 (시간 소요 — 타임아웃 넉넉히)**

```bash
cd /Users/loopy/dev/ll3/Glimpse && cargo test --workspace 2>&1 | tail -15
```
Expected: 모든 테스트 패스.

```bash
cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -5
```
Expected: 경고 0 (exit 0).

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml 2>&1 | tail -3
```
Expected: `Finished` (exit 0).

**Step 2: 헤드리스 동기화 E2E**

```bash
cd /Users/loopy/dev/ll3/Glimpse/apps/mobile && bun run sync:e2e 2>&1 | tail -10
```
Expected: E2E 시나리오 패스 출력. Rust 코드가 최근 변경됐으면(9d9ced5 등) 스크립트가
알아서 재빌드하거나 빌드 지시를 출력한다 — 지시를 따른 뒤 재실행.

**Step 3: 커밋 없음** — Task 1 결과와 함께 축적.

---

### Task 3: deprecated 배럴 임포트 전환

**Files:**
- Modify: 배럴 소비 파일 49개 (아래 Step 1의 grep 목록이 진실 소스)
- Delete: `apps/mobile/src/features/core/application/capture/index.ts`,
  `apps/mobile/src/features/core/application/chat/index.ts`,
  `apps/mobile/src/features/core/application/recommendation/index.ts`,
  `apps/mobile/src/features/core/application/review/index.ts`
- 유지(삭제 금지): 같은 디렉터리의 `index.test.ts`, `helpers.ts`, `types.ts`,
  `state/`, `knowledge/` 전체

**Step 1: 소비 파일 목록 확정**

```bash
cd /Users/loopy/dev/ll3/Glimpse && grep -rln "core/application/\(capture\|chat\|recommendation\|review\)" apps/mobile/src apps/mobile/app --include="*.ts" --include="*.tsx" | grep -v "/core/application/"
```
Expected: 49개 파일 (분포는 사전 지식 참조). **이 목록이 진실 소스** — 하드코딩된 파일 목록을 쓰지 않는다.

**Step 2: 기계적 경로 치환 (sed)**

```bash
grep -rl "core/application/\(capture\|chat\|recommendation\|review\)" apps/mobile/src apps/mobile/app --include="*.ts" --include="*.tsx" | grep -v "/core/application/" | xargs sed -i '' "s#@/src/features/core/application/\(capture\|chat\|recommendation\|review\)#@glimpse/features#g"
```
Expected: 각 파일에서 `@/src/features/core/application/<domain>` → `@glimpse/features`.

주의: 파일 중 `@/src/features/core/application/state`나 `.../knowledge`를 **함께**
임포트하는 파일이 있으면 sed가 그 줄은 건드리지 않는다(정규식이 4개 도메인만 매칭).
한 파일에 두 임포트가 공존하면 import 문이 분리된 채 유지된다 — 정상.

**Step 3: 치환 검증**

```bash
grep -rn "core/application/\(capture\|chat\|recommendation\|review\)" apps/mobile/src apps/mobile/app --include="*.ts" --include="*.tsx" | grep -v "/core/application/" | wc -l
```
Expected: `0`

**Step 4: 배럴 4종 삭제**

```bash
git rm apps/mobile/src/features/core/application/capture/index.ts apps/mobile/src/features/core/application/chat/index.ts apps/mobile/src/features/core/application/recommendation/index.ts apps/mobile/src/features/core/application/review/index.ts
```
주의: `state/index.ts`, `knowledge/index.ts`, 각 `index.test.ts`, `helpers.ts`, `types.ts`는 남긴다.

**Step 5: 잔존 참조 검증 (배럴 내부 상호 참조 확인)**

```bash
cd /Users/loopy/dev/ll3/Glimpse/apps/mobile && bun run typecheck
```
Expected: exit 0. 실패 시 실패 파일의 임포트를 확인해 수동 수리 (예: 배럴끼리 재수출하던 케이스).

**Step 6: 영향 영역 테스트**

```bash
cd /Users/loopy/dev/ll3/Glimpse && bun test apps/mobile/src/features apps/mobile/src/stores 2>&1 | tail -5
```
Expected: 전부 패스.

**Step 7: Commit**

```bash
git add -A && git commit -m "chore(mobile): deprecated application 배럴 4종 제거 — 임포트를 @glimpse/features로 전환"
```

---

### Task 4: 08-16 GUI 체크리스트 정합화

**Files:**
- Modify: `docs/plans/2026-08-16-rustra-integration-plan.md` (GUI 검증 체크리스트 섹션)
- Create: `thoughts/shared/research/2026-08-31_remaining-manual-gates.md`

**Step 1: 19항목 각각의 소화 증거 대조**

항목별로 아래 증거 소스와 대조한다 (증거가 있으면 `[x]`로 전환하고 옆에 증거 커밋/문서를 짧게 주석):

- 데스크톱 7항목: rustra 브리지 전환이 오래됐고 이후 매 라운드 회귀 테스트가 있었으므로,
  코드 레벨 커버리지(`bun test packages/features/src apps/desktop/src`)가 있는 항목은
  "테스트로 커버" 주석과 함께 체크. GUI 자체 확인이 필요한 항목은 수동 문서로 이관.
- 모바일 6항목: "기존 데이터 마이그레이션"은 실기기 검증 리서치
  (`thoughts/shared/research/` 2026-08-29 device-sync 문서) 참조. 시뮬레이터로 확인
  불가한 것은 수동 이관.
- 스트리밍 3항목: 9d9ced5(실모델 검증)에서 로컬 LLM 실추론·스트리밍 검증 완료 —
  커밋 참조로 체크 가능한지 판정.
- OCR 3항목: Android 실기기 의존(이미지 피커 권한) — 실기기 항목으로 이관 판정.

**Step 2: 수동 잔여 게이트 문서 작성**

`thoughts/shared/research/2026-08-31_remaining-manual-gates.md` 생성:

```markdown
---
date: 2026-08-31
researcher: Claude
topic: "잔여 수동 게이트 — 사용자 실기기·계정·GUI 확인 항목"
tags: [research, manual-gates, verification]
status: complete
---

# 잔여 수동 게이트 (2026-08-31)

자동 게이트(Task 1~3) 결과와 별도로 사람 손이 필요한 항목.

## Android 실기기
- [ ] OCR 이미지 피커 권한 후 한국어 스크린샷 추출 (08-16 플랜 OCR 3항목)
- [ ] BGTaskScheduler/WorkManager 상행 델타 (양방향 델타 동기화 플랜)

## iOS 실기기
- [ ] 알림 권한 프롬프트·21:00 리마인더 실제 발화 (core-loop C타Sk)
- [ ] BGTaskScheduler 상행 델타
- [ ] Shortcuts 앱 목록 노출 + 한국어 Siri 트리거(개발 언어 en 주의)

## 계정·배포
- [ ] EAS 자격증명 (Apple/Google 계정)
- [ ] Apple/Google production signing + 스토어 제출 (gap-remediation 플랜)
- [ ] 2026-09-21 전이 취약점 예외 재검토 (달력 이벤트)

## 데스크톱 GUI
- [ ] 전역 단축키·트레이 (Phase 3 구현 후)
- [ ] 리마인더 in-process 재시작 소실 — OS 알림 권한 확인

## 시뮬레이터에서 불가한 것 (참고)
- 권한 프롬프트, 푸시/로컬 알림 실발화, Siri, 실기기 백그라운드 태스크
```

(위 템플릿의 `C타Sk`는 오타 방지용이 아니라 실제로 `core-loop` 플랜 참조로 교체할 것)

**Step 3: 08-16 플랜 체크리스트 갱신**

Step 1의 판정대로 `[x]` 전환 + 증거 주석, 이관 항목은
"→ `thoughts/shared/research/2026-08-31_remaining-manual-gates.md`로 이관" 주석 추가.

**Step 4: Commit**

```bash
git add docs/plans/2026-08-16-rustra-integration-plan.md thoughts/shared/research/2026-08-31_remaining-manual-gates.md
git commit -m "docs(plans): 08-16 GUI 체크리스트 실증 대조 갱신 + 잔여 수동 게이트 문서 신설"
```

---

### Task 5: iOS 시뮬레이터 기동·스크린샷 (환경 허용 시)

**Files:**
- 수정 없음 (스크린샷 산출물만)

**Step 1: 시뮬레이터 가용 확인**

```bash
xcrun simctl list devices available | grep -i iphone | head -3
```
Expected: 부팅 가능한 iPhone이 1개 이상. 없으면 이 Task를 건너뛰고 수동 목록으로 이관한다(실패 아님).

**Step 2: 앱 빌드·기동**

```bash
cd /Users/loopy/dev/ll3/Glimpse/apps/mobile && bun run ios 2>&1 | tail -5
```
Expected: 빌드 성공 + 시뮬레이터에 앱 기동. 빌드 실패 시(서명· entitlement 함정은
2026-08-29 device-sync 리서치의 rustup 우회 절차 참조) 원인을 기록하고 Task 5 종료.

**Step 3: 주요 화면 스크린샷 수집**

```bash
xcrun simctl io booted screenshot /tmp/glimpse-library.png
```
탭 이동(보관함/채팅/다시 보기/다이제스트)마다 스크린샷 1장씩 수집.
`xcrun simctl`만으로 탭 탭이 불가하므로, 앱 딥링크(expo 라우트 URL)나 수동으로 확인.
여기서 확인 가능한 08-16 체크리스트 항목(모바일 Library 로드 등)은 Task 4 문서에
"시뮬레이터 스크린샷으로 확인" 주석 추가.

**Step 4: 커밋 없음 (산출물은 /tmp)** — 확인된 항목을 Task 4에서 이미 갱신한 문서에
후속 커밋으로 반영(필요 시).

---

### Task 6: Phase 1 마감 — 게이트 결과 보고

**Files:**
- Modify: `docs/plans/2026-08-31-roadmap-gates-graph-capture-design.md` (완료 기준 체크)

**Step 1: 최종 회귀 확인**

```bash
cd /Users/loopy/dev/ll3/Glimpse && bun run lint && bun run typecheck && bun run desktop:lint && bun run desktop:typecheck && bun test packages/features/src apps/desktop/src packages/ui 2>&1 | tail -3
```
Expected: 전부 그린.

**Step 2: 로드맵 문서에 Phase 1 완료 표기**

Phase 1 섹션의 완료 기준에 체크 표기:
- 자동 게이트 결과 요약(명령별 exit code)
- 수동 잔여 문서 링크
- 시뮬레이터 검증 범위 명시

**Step 3: Commit**

```bash
git add docs/plans/2026-08-31-roadmap-gates-graph-capture-design.md
git commit -m "docs(plans): Phase 1 게이트 소화 완료 표기"
```
