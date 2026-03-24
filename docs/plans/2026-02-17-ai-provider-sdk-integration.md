# AI Provider SDK Integration (10분 단위 실행 SPEC)

Date: 2026-02-17  
Status: Draft (Chunked v2)  
Author: Claude (restructured by Codex)

## 문제
현재 AI Provider 라우팅 구조는 준비되어 있지만, 실제 SDK 호출이 빠져 있어 Apple/Local LLM이 모두 Stub 동작에 머물러 있습니다. 이 상태에서는 온디바이스 메타데이터 생성 품질/성능을 검증할 수 없습니다.

## 해결 목표
**현재:** Apple/Local LLM provider는 존재하지만, 선택된 provider 중심 정책이 문서/구현에 일관되게 반영되어 있지 않음  
**목표:** Apple Intelligence와 Local LLM에 실제 SDK를 연결하고, 사용자가 선택한 provider를 기준으로 메타데이터 생성 경로를 고정함

## 성공 기준
- [ ] `local-llm-provider.ts`가 실제 llama SDK 호출을 통해 `summary/tags`를 생성한다.
- [ ] `apple-provider.ts`가 네이티브 브리지를 통해 실제 Apple Intelligence 결과를 생성한다.
- [ ] `router.test.ts` 및 신규 provider 테스트가 통과하고, `bun run lint`가 통과한다.

## 범위 제한
- BYOK(OpenAI/Anthropic) 실연동은 이번 범위에서 제외
- 스트리밍 응답, 멀티턴 대화, 임베딩 생성은 제외
- 모델 파인튜닝/커스텀 프롬프트 템플릿 고도화(v2)는 제외

---

## 작업 단위 규칙 (10분 기준)
- 각 태스크는 **10분 내 완료 가능한 최소 변경**으로 쪼갬
- 각 태스크는 **단일 파일 또는 단일 책임** 중심으로 제한
- 각 태스크 완료 시 최소한의 로컬 검증(타입/테스트/로그) 1개 수행
- 4~6개 태스크마다 마일스톤 검증 수행

## 폴더 구조 준수 규칙
- 기존 최상위 폴더 구조를 유지하고 **새 최상위 디렉터리는 만들지 않음**
- TypeScript 구현은 기존 경로 안에서만 추가/수정:
  - `src/features/ai/*`
  - `src/components/settings/*`
  - `src/stores/settings/*`
- iOS 네이티브 구현은 기존 Xcode 타깃 경로 안에서만 추가/수정:
  - `ios/glimpse/*`
- 필요 시 Expo config 확장은 새 폴더 대신 기존 루트 설정 파일(`app.json`, 필요 시 `app.plugin.js`)로 처리
- 기존 파일 이동/대규모 리네임 금지 (small focused change 원칙 유지)

## 마일스톤
- `M1`: Local LLM 경로 end-to-end 최소 동작
- `M2`: Apple Intelligence 경로 end-to-end 최소 동작
- `M3`: 라우팅/테스트/린트 통과

---

## Phase 0. 준비 (약 30분)

| ID | 예상 | 선행 | 작업 | 완료조건 |
|---|---|---|---|---|
| P0-1 | 10m | 없음 | 현재 provider 관련 파일/테스트 위치 확인 (`src/features/ai/providers`, `src/features/ai/metadata`) | 수정 대상 파일 목록 확정 |
| P0-2 | 10m | P0-1 | `llama.rn` 의존성 추가 (`package.json`) | lockfile/manifest에 반영됨 |
| P0-3 | 10m | P0-2 | 빌드 영향 없는 스켈레톤 파일 생성: `src/features/ai/llama-service.ts`, `src/features/ai/apple-intelligence-bridge.ts` | 타입 에러 없이 import 가능 |

---

## Phase 1. Local LLM Provider (M1 목표, 약 90분)

| ID | 예상 | 선행 | 작업 | 완료조건 |
|---|---|---|---|---|
| L1-1 | 10m | P0-3 | `llama-service.ts`에 인터페이스/타입 정의 (`loadModel`, `generate`, `unload`) | provider에서 타입 참조 가능 |
| L1-2 | 10m | L1-1 | `llama-service.ts`에 no-op 기본 구현 + 에러 매핑 유틸 추가 | 런타임 예외 없이 호출 가능 |
| L1-3 | 10m | L1-2 | llama SDK import 및 초기화 경로 연결 | 앱 시작 시 import 에러 없음 |
| L1-4 | 10m | L1-3 | 모델 로드 함수 구현 (`modelPath` 검증 포함) | 잘못된 path 시 명확한 에러 반환 |
| L1-5 | 10m | L1-4 | generate 함수 구현(기본 옵션 `maxTokens`, `temperature`) | 프롬프트 입력 시 문자열 반환 |
| L1-6 | 10m | L1-5 | unload/memory 상태 함수 구현 | unload 후 loaded 상태 false |
| L1-7 | 10m | L1-6 | `local-llm-provider.ts`에서 기존 stub generate 로직을 서비스 호출로 교체(요약) | summary가 실제 생성값 사용 |
| L1-8 | 10m | L1-7 | tags 생성 경로도 서비스 호출로 교체 | tags가 실제 생성 응답 기반 |
| L1-9 | 10m | L1-8 | 예외 처리/`aiProviderError` 매핑 정리 | 실패 시 provider 표준 에러 반환 |

### M1 검증
- `bun test src/features/ai/providers/local-llm-provider.test.ts` (없으면 생성 후 실행)
- 최소 스모크: Local LLM enable + 모델 path 있을 때 generate 호출 로그 확인

---

## Phase 2. Apple Intelligence Provider (M2 목표, 약 120분)

| ID | 예상 | 선행 | 작업 | 완료조건 |
|---|---|---|---|---|
| A2-1 | 10m | P0-3 | Apple 구현 파일 위치를 기존 트리로 확정 (`src/features/ai/*`, `ios/glimpse/*`) | 새 최상위 폴더 없이 경로 확정 |
| A2-2 | 10m | A2-1 | TS 인터페이스 정의 (`isAvailable`, `generate`) | bridge에서 타입 참조 가능 |
| A2-3 | 10m | A2-2 | iOS ModuleDefinition 스켈레톤 추가 | 네이티브 모듈 이름 resolve 가능 |
| A2-4 | 10m | A2-3 | `isAvailable` 네이티브 함수 구현 (`@available` 가드) | 미지원 버전에서 false 반환 |
| A2-5 | 10m | A2-4 | `generate(prompt)` 네이티브 함수 구현 (기본 1회 응답) | prompt 입력 시 문자열 반환 |
| A2-6 | 10m | A2-5 | `app.json` 및 필요 시 루트 `app.plugin.js`에 plugin 연결 (새 plugin 폴더 생성 금지) | prebuild 시 plugin 인식 |
| A2-7 | 10m | A2-6 | `apple-intelligence-bridge.ts`에서 `requireNativeModule` 연결 | JS에서 브리지 호출 가능 |
| A2-8 | 10m | A2-7 | 브리지 에러 매핑(`Result<T>`) 및 안전 실패 처리 구현 | 모듈 미탑재 시 graceful 실패 |
| A2-9 | 10m | A2-8 | `apple-provider.ts` summary 경로를 bridge.generate로 교체 | summary 실제 응답 사용 |
| A2-10 | 10m | A2-9 | tags 경로 교체 + parser 연결 | tags parse까지 완료 |
| A2-11 | 10m | A2-10 | availability 체크 강화(기기/OS/권한 상태) | 미지원 환경에서 즉시 실패 |
| A2-12 | 10m | A2-11 | provider 에러 코드 표준화 (`AI_PROVIDER_INTERNAL_ERROR` 등) | local/apple 에러 포맷 일치 |

### M2 검증
- iOS 환경에서 `isAvailable` true/false 각각 로그 확인
- Apple provider generate 성공/실패 모두 `Result` 형태 일관성 확인

---

## Phase 3. 라우터/설정/UI 연결 (약 60분)

| ID | 예상 | 선행 | 작업 | 완료조건 |
|---|---|---|---|---|
| R3-1 | 10m | L1-9, A2-12 | `metadata/router.ts`에서 선택 provider/readiness 조건 재검토 | 사용자 선택 기준 유지 |
| R3-2 | 10m | R3-1 | 선택된 provider만 호출되도록 라우팅 고정 | 숨은 체인 호출 없음 |
| R3-3 | 10m | L1-9 | `local-llm.store.ts` 모델 path/ready 상태와 provider 연결 확인 | store 상태 변경이 provider에 반영 |
| R3-4 | 10m | A2-12 | `appleIntelligence.store.ts` availability/enable 상태와 provider 연결 확인 | enable 토글이 라우터에 반영 |
| R3-5 | 10m | R3-3 | `LocalLLMSection.tsx`에서 다운로드/준비 상태 문구 최소 정리 | 사용자가 "사용 가능 여부" 판단 가능 |
| R3-6 | 10m | R3-4 | Apple 섹션 상태 문구(지원/미지원) 최소 정리 | iOS 버전 제약이 UI에 노출 |

---

## Phase 4. 테스트 및 검증 (M3 목표, 약 70분)

| ID | 예상 | 선행 | 작업 | 완료조건 |
|---|---|---|---|---|
| T4-1 | 10m | L1-9 | `local-llm-provider.test.ts` 추가: 성공 케이스 | summary/tags 성공 검증 |
| T4-2 | 10m | T4-1 | `local-llm-provider.test.ts` 실패 케이스(모델 없음/SDK 오류) | 표준 에러 검증 |
| T4-3 | 10m | A2-12 | `apple-provider.test.ts` 추가: available + generate 성공 | 성공 Result 검증 |
| T4-4 | 10m | T4-3 | `apple-provider.test.ts` 실패 케이스(미지원/네이티브 오류) | 선택 provider 에러 검증 |
| T4-5 | 10m | R3-2 | `router.test.ts` 선택 provider 회귀 테스트 보강 | 비선택 provider 미호출 보장 |
| T4-6 | 10m | T4-5 | mock 전략 정리(bridge/llama service 공통 mock 헬퍼) | 테스트 중복 감소 |
| T4-7 | 10m | T4-6 | 린트/전체 테스트 실행 전 마지막 타입 오류 정리 | `bun run lint` 실행 준비 완료 |

### M3 최종 검증
- `bun run lint`
- `bun test src/features/ai/metadata/router.test.ts`
- `bun test src/features/ai/providers/local-llm-provider.test.ts`
- `bun test src/features/ai/providers/apple-provider.test.ts`
- 스모크체크 1개: `bun run ios` 또는 `bun run web` (가능한 플랫폼 1개)

---

## 구현 순서 권장
1. `Phase 0 → Phase 1(Local)` 먼저 완료해서 가장 빠른 실제 생성 경로 확보  
2. 이후 `Phase 2(Apple)` 진행, 모듈/브리지/Provider 순서 고정  
3. 마지막에 `Phase 3/4`로 라우팅 회귀와 테스트 안정화

## 리스크 및 대응
- iOS/Android llama 성능 편차: 플랫폼별 권장 모델 목록 분리
- Apple Intelligence 기기 제약: availability 체크 + 명시적 실패 처리
- 모델 파일 용량 부담: 초기에는 다운로드 UI 단순화, 크기 명시
- 네이티브 API 변동: Bridge 레이어에 에러 매핑 집중

## 참고 파일
- `src/features/ai/providers/local-llm-provider.ts`
- `src/features/ai/providers/apple-provider.ts`
- `src/features/ai/metadata/router.ts`
- `src/stores/settings/local-llm.store.ts`
- `src/stores/settings/appleIntelligence.store.ts`
- `src/components/settings/LocalLLMSection.tsx`
- `ios/glimpse/`
