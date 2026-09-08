# 지금 이 앱에 무엇이 필요한가 — 내부 1차 자료 기반 리서치 (2026-09-08)

**날짜**: 2026-09-08
**근거**: 저장소 1차 자료만 (플랜 문서·thoughts 기록·git status·CI 실행 기록·소스 코드 직접 확인). 코드 수정 없음.
**시점 특이사항**: 2026-09-08 완전 로컬 AI 전환 구현이 워킹트리에 완료됐으나 **미커밋 175파일** 상태
(트랙드 138 + 언트랙드 37, `git status --short`). 로컬 게이트(테스트 907·lint·typecheck·cargo check)는
통과, origin/main CI는 적색.

---

## 요약 — 우선순위 Top 5

1. **미커밋 175파일을 영역별로 분리 커밋한다.** 특히 `apps/desktop/src-tauri/icons/32x32.png`,
   `128x128.png`, `128x128@2x.png` 3종 — 2026-09-06 CI 실패의 직접 원인이 "fresh 클론에 아이콘이
   없어 `tauri::generate_context!()` 패닉"임이 로그로 확증됐다. CI 복구 플랜의 Limitations 절이
   예고한 그대로다 (`docs/plans/2026-09-06-ci-recovery.md` "until committed, a fresh clone still
   lacks them"). 아이콘만 커밋해도 Rust·weekly-deb 두 job은 녹색 경로에 들어간다.
2. **CI 잔여 적색 3원인 소화.** (i) 아이콘 미커밋(위), (ii) `mobileCoreClient typed bridge
   contract` 6 fail — 로컬 워킹트리에서 재실행 결과 **6 pass로 이미 수리됨**(이번 검증에서 확인),
   즉 커밋만으로 해소, (iii) 주간 audit-high 실패는 `.github/workflows/ci.yml`의 설계된 항목
   (main 레인에서 항상 레드가 되는 transitive advisory — job 주석 명시)이므로 소화 대상이 아니다.
3. **데스크톱 챗 지속 임베딩 인덱스.** `apps/desktop/src/features/ai/chat-generation.ts:53`의
   `RAG_LIBRARY_LIMIT = 100`과 `:124`의 TODO("임베딩 캐시 + 최신성 우선 정렬이 후속 작업")가
   상태 그대로다. 메시지마다 최대 100개 항목을 재임베딩하는 구조인데, 클라우드 BYOK 제거로 임베딩이
   느린 로컬 경로가 된 지금 이 상한은 "100개 넘으면 관련 항목이 조용히 잘려나가는" 정확성 결함으로
   성격이 바뀌었다 (`docs/plans/2026-09-08-local-only-ai-runtime.md` 비목표 섹션도 "사실상 ②와
   함께 진행해야 유용하다"고 인정).
4. **수동 게이트 소화 — 특히 `libglimpse_bridge.a` 재생성·커밋.** 커밋된 Android 정적 라이브러리가
   `glimpse_jni_init` no_mangle 수리(597f822) 이전 빌드라는 전제가 아직 유효하다(git status에
   `libglimpse_bridge.a` 없음 → 미갱신). 이것이 Android 실기기 게이트 2건의 선행 조건이다
   (`thoughts/shared/research/2026-08-31_remaining-manual-gates.md` "Android bridge 재생성 전제").
   미소화 게이트는 이관 분 포함 약 24건.
5. **챗 툴콜의 가시화·제어 완성.** 도구 실행은 참조 칩으로만 소비되고 도구 이름·인자·결과는
   UI에 노출되지 않으며(`apps/desktop/src/components/chat/ChatView.tsx:155` —
   `searchReferencesFromToolRuns` 매핑만 존재), `toolsEnabled` 설정 플래그가 기본 true로 켜져
   있으면서 설정 UI 토글이 없다(`apps/desktop/src/lib/settings-storage.ts:35,52` —
   settings 컴포넌트 grep 0건). 플랜이 "no UI toggle yet"로 남겨둔 그 자리다
   (`docs/plans/2026-09-08-real-usage-recovery.md` Area D).

---

## 차원별 상세

### ① 즉시 정리 — 커밋·수동 게이트·CI

**미커밋 175파일 분류** (`git status --short` 전수 기준, 트랙드 diff는 +1675/−5330):

| 영역 | 규모 | 대표 파일 |
|---|---|---|
| BYOK 완전 제거(삭제) | 약 30파일 D | `apps/desktop/src/features/ai/providers/byok-provider.ts`, `apps/mobile/src/features/settings/byok.*`(12), `apps/mobile/src/stores/settings/byok.store.ts`, `apps/mobile/src/features/search/byok-embedding-client.ts` |
| 로컬 런타임 전환(수정) | 약 70파일 M | `apps/desktop/src/features/ai/router.ts`, `apps/desktop/src/lib/settings-storage.ts`, `apps/mobile/src/features/ai/targets/registry.ts`, `packages/shared/src/local-model-registry.ts` |
| 로컬 서버 자동 감지(신규) | 5파일 | `apps/desktop/src/features/ai/providers/local-server-detect.ts`, `local-server-provider.ts`, `apps/desktop/src/components/settings/LocalServerSection.tsx` |
| 챗 툴콜(신규) | 7파일 | `apps/desktop/src/features/ai/tools/`(tool-loop·tool-definitions·tool-schemas 등) |
| digest 내러티브·Today 카드(신규) | 8파일 | `packages/features/src/daily/`, `apps/desktop/src/components/digest/{DailyNarrativeSection,TodaySummarySection}.tsx`, `apps/mobile/src/hooks/useDailyNarrative.ts` |
| 모바일 모델 카탈로그·GGUF 탐색기(신규) | 6파일 | `apps/mobile/src/components/settings/GGUFExplorer.tsx`, `apps/mobile/src/features/ai/model-manager/huggingface-search.ts`, `local-llm.custom-download.ts` |
| 카메라·Shortcuts 이미지 캡처 | 8파일 | `apps/mobile/src/hooks/useCaptureImage.ts`, `apps/mobile/ios/glimpse/CaptureQuickNoteIntent.swift`, `apps/mobile/src/features/share/process-share-data.ts` |
| 그래프 여정 지표(신규) | 12파일 | `packages/features/src/graph/journey.ts`, `local-metrics.ts`(v2), 양 플랫폼 `graph-metrics.store.ts`, e2e 2건 |
| CI 복구 아티팩트 | 7파일 | `.gitignore`(아이콘 예외), `apps/desktop/src/tauri-bundle-resources.test.ts`, `apps/desktop/src/features/ai/router-module-isolation.test.ts`, `scripts/ai-router-ordering-check.sh`, **아이콘 PNG 3(untracked)** |
| 데스크톱 Rust 다운로드 고도화 | 6파일 | `apps/desktop/src-tauri/src/download_activity.rs`(신규 — App Nap 가드), `download.rs`, `commands.rs` |
| 문서·리서치 | 9파일 | `docs/daily-driver-builds.md`, `docs/plans/2026-09-0{6,8}-*.md` 5건, thoughts 3건 |

커밋 분리 제안은 플랜들이 이미 명시한다 — 공유/모바일/데스크톱 3분할
(`docs/plans/2026-09-08-digest-ai-narrative.md` "검증" 절), CI 복구는 아이콘+가드 테스트를
한 커밋으로 (`docs/plans/2026-09-06-ci-recovery.md` Scope 3~4).

**수동 게이트 잔량** (`thoughts/shared/research/2026-08-31_remaining-manual-gates.md`):
미체크 약 24건 — Android 실기기 2(OCR, BGTask 상행 델타), iOS 실기기 3(알림 21:00 발화,
BGTask, Shortcuts 한국어 Siri), 계정·배포 4(EAS 자격증명, 스토어 서명·제출, privacy/support URL,
**2026-09-21 전이 취약점 예외 재검토** — 오늘 기준 13일 남음), 데스크톱 GUI 1(OS 알림),
이관 분 14(graph-capture GUI 4, apply-loop GUI 3, delta-sync 시뮬레이터 6, core-loop 알림 4,
updater endpoint 1 — 이 중 일부가 상기 분류와 겹침). 선행 조건 1순위는 위 Top 5-4의 `.a` 재생성.

**CI 상태** (최신 run 34058084289, 2026-09-06 스케줄, origin/main=093520a):

| Job | 결과 | 원인 |
|---|---|---|
| JS | 실패 | `test:coverage` 6 fail — 전부 `mobileCoreClient typed bridge contract`. **로컬 워킹트리 재실행 6 pass 확인**(이번 검증) → 커밋으로 해소 |
| Rust | 실패 | `generate_context!()` 패닉 — `icons/32x32.png: No such file or directory` |
| Desktop bundle(주간 deb) | 실패 | 동일 아이콘 원인 |
| Audit(주간 high) | 실패 | 설계된 상시 실패(`.github/workflows/ci.yml` audit-high 주석) |
| iOS Release / Android Release / Desktop smoke / paths | 성공 | — |

### ② 기능 갭 — 알려진 후보 6종의 코드 실상 + 신규 발견

**(a) 지속 임베딩 인덱스 — 미착수 확증.** `apps/desktop/src/features/ai/chat-generation.ts:53,120-124`:
`RAG_LIBRARY_LIMIT = 100` 컷 + `TODO: 임베딩 캐시 + 최신성 우선 정렬이 후속 작업`. 채팅 메시지마다
라이브러리 로드→재임베딩→랭킹 전체가 재실행된다. 로컬 임베딩은 생성이 느리므로(플랜 인용) 데스크톱
챗 RAG의 체감 지연·정확성 양쪽을 두는 가장 큰 단일 갭. 로컬 전환 완료된 지금이 착수 적기다.

**(b) 툴콜 결과 가시화/영수증 — 부분 구현.** 도구 루프는 `toolRuns`(이름·인자·결과)를 수집하고
실패 도구는 `{error}` 결과로 모델 복구까지 지원한다(`apps/desktop/src/features/ai/tools/tool-loop.ts:105-138`).
그러나 UI는 `searchReferencesFromToolRuns`로 참조 칩을 만들 뿐
(`apps/desktop/src/components/chat/ChatView.tsx:155`) 도구 실행 자체의 영수증이 없다. `save_note`처럼
라이브러리를 **변경하는** 도구가 있는 지금(`apps/desktop/src/features/ai/tools/tool-definitions.ts:168`
— 캡처 컨벤션 재사용) 실행 영수증은 신뢰 문제로 승격된다. `toolsEnabled` 토글 부재도 같이 묶인다.

**(c) 캡처 이미지 이해 — 데이터 계약이 미저장 확정.** `apps/mobile/src/features/share/process-share-data.ts:31`
"(today's contract stores OCR text only, never image bytes)" — Shortcuts 이미지는 파일을 App Group에
임시 쓴 뒤 OCR 텍스트만 본문으로 남긴다. mmproj는 모바일 GGUF 탐색기에서 **태깅만** 존재
(`apps/mobile/src/features/ai/model-manager/huggingface-search.ts:18,69`)이고 데스크톱 llama.cpp
런타임에 mmproj 다운로드·멀티모달 로드 경로는 없다. 즉 VL 지원은 "탐색기 표시"와 "런타임" 사이
단절 상태. Rust 스키마 변경을 수반하므로 플랜들의 비목표 유지가 합리적 — 단, vision 태그만 UI에
노출 중인 점(`apps/desktop/src/components/settings/ModelCard.tsx:64`)은 기대치 관리 관점에서 정리 여지.

**(d) 웹 클리퍼/브라우저 확장 — 부재.** 코드 grep 0건, `docs/plans/2026-09-08-real-usage-recovery.md:78`
비목표로만 존재. 캡처 채널 중 유일한 "데스크톱 브라우저 출처" 경로가 전역 단축키+클립보드 수동 붙여넣기뿐.

**(e) HealthKit/워치 — 부재.** grep 0건. 비목표 유지 중
(`docs/plans/2026-09-08-digest-ai-narrative.md` 비목표 섹션).

**(f) LAN 추론 허브 — 부재, 기록만.** `docs/plans/2026-09-08-local-only-ai-runtime.md` 비목표:
"모바일→데스크톱 LAN 추론 허브 … v2로 기록만". grep 0건. 데스크톱 동기화 서버(34129 포트, mDNS
페어링 인프라)가 이미 있으므로 추론 엔드포인트 확장의 토대는 갖춰져 있다.

**신규 발견 갭:**
- **모바일 챗 RAG가 토큰 매칭 휴리스틱** — `apps/mobile/src/features/ai/chat-context.ts:27-34`
  (제목/본문 includes 점수제). 08-31 리서치가 지적했고 여전히 유효. 모바일은 검색 리랭크가
  온디바이스 임베더로 전환 완료됐는데(`apps/mobile/src/features/search/useMobileSemanticRerank.ts:18,43`)
  챗 컨텍스트만 임베딩 미적용 — 데스크톱 (a)와 함께 "임베딩 일원화"로 묶어 처리 가능.
- **toolsEnabled UI 토글 부재** — 위 Top 5-5.
- **updater 서명 공란 지속** — `apps/desktop/src-tauri/tauri.conf.json:48-49` `"pubkey": ""`,
  `"endpoints": []`. 로컬 빌드 전략下 우선순위 낮지만, 남아있는 한 "업데이트 배포 경로 0"임이
  설정 파일 자체가 증언한다.
- **git 태그 0개** — `git tag | wc -l` = 0. 어떤 커밋이 오늘 기기에 설치한 빌드와 대응하는지
  추적 불가. 로컬 릴리즈 제도의 최소 장치로 태깅 관행만으로도 가능.

### ③ UX 마찰 — 캡처→재방문 루프, 빈 상태·온보딩

- **재방문 이유는 만들어졌고, 이제 관찰이 과제.** TodaySummaryCard+AI 내러티브가 양 플랫폼 digest에
  배치됐고(신규 파일 목록 위 표), 빈 상태도 있다 — 모바일 `apps/mobile/app/(tabs)/digest.tsx:69-71`
  ("추천이 없습니다" + 안내 문구), 데스크톱
  `apps/desktop/src/components/digest/TodaySummarySection.tsx:14`(isEmpty 분기),
  내러티브는 조용한 폴백(`DailyNarrativeSection.tsx:17-19`). 캡처→발견→재방문 여정 지표도 v2로
  깔렸다(`packages/features/src/graph/journey.ts`). 남은 것은 **1주 관찰 프로토콜의 실제 실행** —
  절차·성공 기준까지 사전등록돼 있는데
  (`thoughts/shared/research/2026-09-06_graph-journey-observation-protocol.md` "1주 관찰 절차")
  실행 기록은 아직 없다.
- **온보딩 플로우 전무.** "onboarding/온보딩/첫 실행" grep이 앱 코드에서 0건. 로컬 모델 다운로드,
  동기화 페어링, 캡처 채널(공유 시트·Shortcuts·트레이)이라는 첫 가치 3종이 모두 설정 화면 안에만
  있다. 완전 로컬 전환으로 "앱 열면 모델 받아야 AI가 작동"한 상태가 된 지금, 첫 실행 유도 부재는
  이전보다 큰 마찰이다. 오너 본인 사용이 전제라도 "모델 미다운로드 상태로 챗/라벨링 실패 시 무엇을
  보게 되는가"의 답이 없다.
- **데스크톱 digest 화면 비대화** — `apps/desktop/src/app/_authenticated/digest.tsx`가 수정 대상이었고
  내러티브 섹션 분리까지 완료. 빈 상태 계열은 구현 완료로 보고, 이 차원의 실질 과제는 위 관찰 실행과
  온보딩이다.

### ④ 데이터 — 데스크톱-모바일 동기화 실상

`docs/desktop-mobile-sync.md` 대조 결과, 동기화는 **이 앱에서 가장 성숙한 인프라**다:

- 양방향·증분 델타(워터마크+ack 커서, LWW 멱등 재시도), 30분 정합화 스냅샷, 병합 전
  `backups/pre-sync/` 파일 백업(5개 롤링), tombstone 하드 삭제, 토큰 페어링(IP 레이트리밋),
  mDNS(LAN)+Tailscale Serve(원격) 이중 경로 — 전부 문서화된 구현 서술.
- 코드 실측도 부합: 모바일 동기화 클라이언트 `apps/mobile/src/features/sync/sync-client.ts`(542줄)와
  워터마크·업스트림 테스트 2종이 존재.
- 갭은 구현이 아니라 **검증의 신선도**: 시뮬레이터 수동 E2E 6항목(페어링, 캡처 전파, 채팅 반영,
  복습 일치, 강제 종료 복구, 네트워크 단절 복구)과 실기기 BGTask 항목이 이관 분으로 미소화다
  (`thoughts/shared/research/2026-08-31_remaining-manual-gates.md` delta-sync 절).
  특히 BYOK 제거·스토어 스키마 변경 175파일이 이 검증 이후에 들어왔으므로, 커밋 후 동기화
  재검증 1사이클이 권장된다.
- 참고: 그래프 문서의 공급자 서술은 구형 — "Desktop Local LLM or BYOK provider"
  (`docs/desktop-mobile-sync.md` Knowledge graph 절). BYOK가 제거된 지금 문서 정합화 1줄 필요.

### ⑤ 성능·품질 — 테스트 인프라, 복잡도 핫스팟

- **테스트 인프라는 오히려 강해지는 중.** bun mock.module 프로세스 전역 오염은 DI로 근본 수리됐고
  (`apps/desktop/src/features/ai/chat-generation.ts` ChatRouterDeps, chat-generation.ts:14-17 주석),
  순서 회귀 가드(`scripts/ai-router-ordering-check.sh`)·모듈 격리 테스트
  (`router-module-isolation.test.ts`)·번들 리소스 가드(`tauri-bundle-resources.test.ts`)가
  신설했다. 로컬 907 통과 대비 CI 6 fail은 전부 커밋 대기 상태로 해소 예정(① 확증).
- **복잡도 핫스팟**: 200줄 초과 **61파일**, 500줄 초과 3파일 —
  `packages/shared/src/local-model-registry.ts` **1012줄**(최대, 모바일 28종 카탈로그 확장으로 급증),
  `apps/mobile/src/features/ai/llama-service.test.ts` 557, `apps/mobile/src/features/sync/sync-client.ts`
  542. local-model-registry는 데이터 테이블 성격이라 즉시 분할보다 "카탈로그 데이터 파일 분리"
  형태의 완화가 현실적. AGENTS.md 기준상 신규 편집 시 분할 평가 대상 1순위.
- Rust 쪽 TODO/FIXME은 0건(전체 grep에서 유일한 실질 TODO가 chat-generation.ts:124 하나 —
  이 저장소의 미완료 관리가 플랜 문서 중심임을 재확인).

### ⑥ 배포 — TestFlight/스토어 경로, 로컬 릴리즈

- **스토어 경로는 오너 결정으로 명시 제외.** TestFlight/스토어/CI 서명은 비목표
  (`docs/plans/2026-09-08-real-usage-recovery.md:14`), 수동 게이트의 계정 항목도 "명시적으로 제외"
  각인(`remaining-manual-gates.md:57-59`). `apps/mobile/eas.json`은 존재하지만 development
  simulator 프리셋 수준이고 자격증명은 게이트 미소화.
- **로컬 릴리즈 경로는 문서화 완료.** `docs/daily-driver-builds.md` — `ios:release:device`,
  `android:release`, `tauri:build:release/:llm` 스크립트가 실제로 존재
  (`package.json:36-37`, `apps/mobile/package.json:13-14` 확인). 7일 개인팀 프로비저닝 만료 주기와
  데이터 보존 조건까지 기록됨.
- 잔여 미세 갭 2건: (i) 7일 만료마다 수동 재실행 부담 — 유료 개발자 계정의 1년 프로필이 유일한
  완화책이며 계정 게이트와 연결, (ii) updater 공란(tauri.conf.json:48-49) — 자기 기기 재설치 시
  항상 수동 복사 경로.
- 데스크톱은 CI의 주간 deb 번들 검증조차 아이콘 커밋 전까지는 실패 상태 — ①이 선행된다.

---

## 근거 목록

- `docs/plans/2026-09-08-real-usage-recovery.md` — 실사용 회복 플랜, Area A~D, 비목표(클리퍼·HealthKit·이미지 바이트·스토어)
- `docs/plans/2026-09-08-local-only-ai-runtime.md` — BYOK 제거·로컬 3계층·LAN 허브 v2 기록·임베딩 인덱스 의존 명시
- `docs/plans/2026-09-08-digest-ai-narrative.md` — 내러티브 플랜, 조용한 폴백, 커밋 3분할 지시
- `docs/plans/2026-08-31-ci-recovery-and-doc-parity.md`, `docs/plans/2026-09-06-ci-recovery.md` — CI 수리 내역과 "아이콘 미커밋 시 fresh 클론 실패" 예고(Limitations)
- `docs/plans/2026-09-06-graph-evaluation.md` — 여정 지표 범위·수용 기준
- `thoughts/shared/research/2026-08-31_remaining-manual-gates.md` — 수동 게이트 단일 진실 소스(미소화 약 24건, `.a` 재생성 전제, 09-21 재검토)
- `thoughts/shared/research/2026-08-31_18-23-35_project-direction-and-next-steps.md` — 이전 방향성 리서치(모바일 챗 휴리스틱 지적 등, 본 리서치에서 재확증분 표기)
- `thoughts/shared/research/2026-09-06_graph-journey-observation-protocol.md` — 1주 관찰 절차 사전등록(실행 전)
- `docs/desktop-mobile-sync.md` — 동기화 실상(델타·백업·페어링), BYOK 잔존 표기 드리프트
- `docs/daily-driver-builds.md` — 로컬 릴리즈 경로 문서화 완료
- `apps/desktop/src/features/ai/chat-generation.ts:53,124` — RAG_LIBRARY_LIMIT=100 + 임베딩 캐시 TODO
- `apps/desktop/src/features/ai/tools/tool-loop.ts:105-138`, `apps/desktop/src/components/chat/ChatView.tsx:155` — toolRuns 수집 vs 참조 칩만 소비
- `apps/desktop/src/lib/settings-storage.ts:35,52` — toolsEnabled 기본 true, UI 토글 부재
- `apps/mobile/src/features/share/process-share-data.ts:31`, `apps/mobile/src/features/ai/model-manager/huggingface-search.ts:18,69` — 이미지 미저장 계약, mmproj 태깅만
- `apps/mobile/src/features/ai/chat-context.ts:27-34`, `apps/mobile/src/features/search/useMobileSemanticRerank.ts:18,43` — 모바일 챗 휴리스틱 vs 리랭크 온디바이스 전환
- `apps/desktop/src-tauri/tauri.conf.json:48-49` — updater pubkey/endpoints 공란
- `.github/workflows/ci.yml` — job 구성과 audit-high 상시 실패 설계
- GitHub Actions run 34058084289(2026-09-06) — JS 6 fail(mobileCoreClient), Rust/deb 아이콘 패닉, 나머지 성공
- `apps/mobile/src/features/core/mobile-core-client.test.ts` 로컬 재실행 — 6 pass(커밋 대기 수리 확인)
- `git status --short`(175파일), `git log --oneline -10`(093520a HEAD), `git tag`(0개), 복잡도 집계(200줄+ 61파일, 500줄+ 3파일)
