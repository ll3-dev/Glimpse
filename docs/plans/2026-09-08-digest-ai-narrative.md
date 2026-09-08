# 오늘 요약 AI 내러티브 — 구현 플랜 (2026-09-08)

## 배경

- 실사용 회복 플랜(`2026-09-08-real-usage-recovery.md`) C 영역의 후속. 현재 `packages/features/src/daily/today-summary.ts`는 순수 계산(캡처 수·미리보기·엣지 수)이며 AI가 개입하지 않는다.
- 2026-09-08 AI 사용 패턴 조사에서 핵심 트렌드는 "proactive memory"(저장된 정보가 관련될 때 스스로 브로핑). 재방문 이유를 만들려면 요약이 **계산이 아니라 해석**이어야 한다.
- 모델 운용 판단: `thoughts/shared/research/2026-09-08_ai-model-selection-under-constraints.md` 및 완전 로컬 전환 결정(`docs/plans/2026-09-08-local-only-ai-runtime.md`) — 오늘 요약은 "1~3회/일 × 품질 민감" 등급. 모바일은 Apple Foundation Model(무료·온디바이스) 우선, 데스크톱은 로컬 경로(관리 런타임 또는 감지된 로컬 서버)만 사용한다.

## 목표

1. 오늘의 캡처+그래프 활동을 근거로 한 **2~4문장 내러티브**를 TodaySummaryCard에 추가한다. 룰 기반 카드는 유지하고 AI 문단은 증강 계층으로 붙인다.
2. 모바일: `AIFeature`에 `summary` 신규 — Apple FM 우선, BYOK/local 폴백.
3. 데스크톱: `features/ai/router` 경유 생성. 프로바이더 미설정(rules)이면 AI 문단을 표시하지 않는다(조용한 폴백 — 카드 자체는 유지).
4. 하루 1회 자동 생성 + 수동 재생성, 결과는 일자 키로 캐시.

## 비목표

- 이미지 이해·이미지 바이트 영속화, 웹 클리퍼, HealthKit — 기존 비목표 유지.
- `byok.backgroundModel` 슬롯 분리(모델 판단 노트 레버 ③) — 별도 플랜.
- 임베딩 인덱스 지속화(우선순위 ②), 챗 tool-calling UX(우선순위 ④) — 각각 별도.
- 요약의 영구 저장·아카이브(오늘 화면용 캐시만).

## 설계

### 공유 순수 함수 — `packages/features/src/daily/`

플랫폼 무관 로직은 공유 패키지에 둔다(기존 `today-summary.ts` 위치와 동일 계층).

- `buildDailyNarrativeInput(todaySummary)` — 기존 요약 데이터셋(캡처 제목·태그·오늘 생긴 엣지)을 프롬프트 입력으로 변환.
- `buildDailyNarrativePrompt(input)` — 빌더. 지침: 2~4문장, 실제 항목명 인용, 새로 생긴 연결 언급, **캡처 0건이면 생성 자체를 생략**(과장 금지).
- `parseDailyNarrative(response)` — 길이 상한 컷, 마크다운 문법 제거 등 정규화.

### 모바일 — `apps/mobile/`

- `src/features/ai/targets/types.ts`: `AIFeature`에 `'summary'` 추가.
- `src/features/ai/targets/registry.ts`:
  - apple 타깃 `featureSupport`에 `summary` 추가(**선행 확인**: `apple-intelligence-bridge.ts`가 요약 규격 텍스트 생성을 지원하는지. metadata 생성 경로와 동일하면 재사용).
  - local 타깃 `featureSupport`에 `summary` 추가(완전 로컬 전환 전제 — byok 타깃은 `2026-09-08-local-only-ai-runtime.md`에서 제거).
  - `resolveEffectiveTargetId`에 summary 케이스. 폴백은 stub(AI 문단 숨김으로 동작).
- `src/stores/settings/ai-targets.store`: `summaryTargetId` 설정 추가.
- digest 화면(`app/(tabs)/digest.tsx`): TodaySummaryCard 하단에 내러티브 문단 + 재생성 액션. 앱 포그라운드 진입 시 하루 1회 자동 생성(기존 `runForegroundLabeling` 포그라운드 잡 패턴 참조).
- 캐시: 일자 키 로컬 저장, 재생성 시 무효화.

### 데스크톱 — `apps/desktop/`

- `src/app/_authenticated/digest.tsx`: 오늘 데이터로 생성 요청. 기존 `use-metadata-generation.ts`(CaptureModal의 요약+태그) 패턴 재사용 — router 경유 비챗 생성.
- rules 프로바이더면 요청하지 않고 문단 미표시.
- 캐시: 일자 키, 재생성 버튼.
- 파일이 200줄을 넘으면 내러티브 섹션을 `src/components/digest/`로 분리(AGENTS.md 복잡도 기준).

### 모델 라우팅 요약

| 플랫폼 | 우선 | 폴백 | 비고 |
|---|---|---|---|
| 모바일 | Apple FM `summary` 타깃 | local 추천 모델 → stub(숨김) | 배터리 보호: 로컬 LLM 자동 실행 없음 |
| 데스크톱 | 로컬 관리 런타임(추천 모델) 또는 감지된 로컬 서버 | — | 사용 가능 로컬 모델 없으면 미표시 |

BYOK 제거·로컬 서버 자동 감지 등 런타임 전환 자체는 `docs/plans/2026-09-08-local-only-ai-runtime.md`로 분리한다. 이 플랜은 요약 생성 소비자로서 로컬 경로만 사용한다.

## 작업 순서

1. 공유 순수 함수 + 테스트(입력/프롬프트/파서 — provider 없이 검증 가능).
2. 모바일 `summary` 타깃 + registry/store + digest UI + 포그라운드 자동 생성.
3. 데스크톱 digest 문단 + 캐시.
4. 검증(아래) 후 커밋 분리: 공유/모바일/데스크톱.

## 검증

- `bun test` — 순수 함수 테스트 신규, registry summary 라우팅 테스트, 기존 3종 스위트(모바일/데스크톱/features) 회귀.
- `bun run lint`.
- 수동 게이트: FM 미지원 기기에서 AI 문단 숨김, Apple FM 기기에서 생성 확인, 데스크톱 rules 프로바이더에서 미표시 확인, 캐시가 당일 재진입 시 재생성하지 않는지.
