---
date: 2026-02-16
author: loopy
status: draft
type: feature
priority: high
---

# AI 메타데이터 생성(Apple + Local LLM + BYOK) 도입 SPEC

## 문제
현재 저장 파이프라인은 `generateSummaryStub`, `generateTagsStub`를 사용해 요약/태그를 생성하므로 품질이 낮고, 이미 존재하는 Apple/BYOK 설정이 실제 추론에 연결되어 있지 않다.

## 해결 목표
캡처 저장 시점(`saveKnowledgeItem`)의 `summary/tags` 스텁을 실제 AI 추론으로 교체한다.

**현재:** 저장 시 스텁 기반 메타데이터만 생성되고 선택 provider 정책이 일관되게 연결되어 있지 않음
**목표:** 저장 시 실추론 메타데이터를 생성하고, 사용자가 선택한 provider를 기준으로 호출 경로를 고정한다

## 성공 기준
- [ ] `saveKnowledgeItem` 경로에서 summary/tags가 스텁이 아닌 provider 기반으로 생성된다.
- [ ] provider 라우팅이 사용자가 선택한 provider 하나만 호출하도록 동작한다.
- [ ] iOS/Android에서 공통 라우팅 로직 테스트와 저장 통합 테스트가 통과한다.

## 범위 제한
- 채팅 UI/대화형 Assistant 화면은 이번 범위에서 제외한다.
- 추천(`recommendation`) 생성 로직 AI 고도화는 이번 범위에서 제외한다.
- DB 스키마 변경은 하지 않는다(`summary`, `tags` 기존 컬럼 재사용).
- Web 플랫폼은 기존 동작(스텁/비활성) 유지로 둔다.

## 중요 인터페이스/타입 변경
- `src/features/capture/saveKnowledgeItem.types.ts`
  - `generateSummaryStub`, `generateTagsStub` 의존성을 `generateMetadata(input)` 형태 단일 인터페이스로 교체
  - 반환 타입: `{ summary: string; tags: string[] }`
- `src/features/settings/*`
  - 추론 provider 선택 상태를 표현하는 타입 추가
  - Local LLM 설정(다중 모델 선택) 상태 추가
- 신규 모듈
  - `src/features/ai/metadata/types.ts`
  - `src/features/ai/metadata/router.ts`
  - `src/features/ai/providers/apple.ts`
  - `src/features/ai/providers/local.ts`
  - `src/features/ai/providers/byok.ts`

## 구현 방향
1. AI 추론 공통 계약 정의
- `MetadataProvider` 인터페이스 정의
- 메서드: `isAvailable()`, `generateSummary()`, `generateTags()`
- 에러 표준화: provider별 원본 에러를 공통 `AI_PROVIDER_ERROR`로 매핑

2. Provider 라우터
- 입력: 캡처 content + 설정 상태
- 규칙:
  - 사용자가 선택한 provider만 호출
  - 선택된 provider가 미지원/실패면 그 결과를 그대로 반환
  - `default` 모드에서는 기존 스텁 provider 사용

3. Apple provider
- 기존 Apple 토글 가용성 로직 재사용
- iOS 버전 판별은 런타임 capability 체크 기반으로 보강
- 현재 코드의 하드코딩 최소 버전 문구와 실제 provider capability를 분리

4. Local LLM provider
- `react-native-llm` 기반 연동
- 모델은 다중 선택 가능(사용자 선택 모델 ID/경로 저장)
- iOS/Android 공통 인터페이스 제공, 플랫폼별 미지원 기능은 `isAvailable=false` 처리

5. BYOK provider
- 기존 BYOK 상태(`enabled/provider/apiKey`) 재사용
- provider(OpenAI/Anthropic/Google)별 호출 어댑터를 동일 계약으로 래핑
- 네트워크/응답 실패는 선택된 provider 실패로 그대로 반환

6. 저장 유스케이스 연결
- `saveKnowledgeItem`에서 스텁 직접 호출 제거
- `aiMetadataService.generate(input)` 결과를 `summary/tags`로 주입
- 실패 시에도 저장은 진행되도록 graceful degradation 유지

## 테스트 케이스
1. 단위 테스트
- 선택된 provider만 호출되는지 검증
- 각 provider `isAvailable` 분기 검증
- `default` 모드에서만 스텁 provider가 호출되는지 검증

2. 기존 유스케이스 회귀
- `saveKnowledgeItem.test.ts`를 provider mock 기반으로 갱신
- 요약/태그가 저장 payload에 반영되는지 검증

3. 플랫폼 시나리오
- iOS: Apple 선택 시 Apple만 호출
- iOS/Android: Local 선택 시 Local만 호출
- iOS/Android: BYOK 선택 시 BYOK만 호출
- default 모드에서만 스텁 호출

4. 최소 검증 명령
- `bun test src/features/capture/saveKnowledgeItem.test.ts`
- `bun test src/features/ai`
- `bun run lint`
- `bun run ios` 또는 `bun run android` 스모크

## 가정 및 기본값
- 기본 동작은 사용자가 선택한 provider를 우선하며, `default` 모드만 스텁을 사용한다.
- Local 모델은 단일 고정이 아닌 다중 모델 선택 UI/상태를 제공한다.
- 저장 성공률을 우선하므로 AI 실패가 저장 실패로 전파되지 않도록 한다.

## 참고 자료
- 내부 코드
  - `src/features/capture/saveKnowledgeItem.ts`
  - `src/features/capture/stubs.ts`
  - `src/features/settings/appleIntelligence.service.ts`
  - `src/features/settings/appleIntelligence.version.ts`
  - `src/features/settings/byok.commands.ts`
  - `src/stores/settings/byok.store.ts`
- 외부 자료
  - https://support.apple.com/en-us/121115
  - https://developer.apple.com/documentation/foundationmodels
  - https://react-native-ai.dev/docs/introduction
  - https://www.npmjs.com/package/@react-native-ai/apple
  - https://github.com/mrousavy/react-native-llm
