---
date: 2026-02-16
author: loopy
status: draft
type: feature
priority: high
---

# AI Meta 01 공통 계약 타입 SPEC

## 문제
현재 메타데이터 생성 로직은 `generateSummaryStub`, `generateTagsStub` 함수 시그니처에 고정되어 있어 provider 교체와 선택 기반 라우팅을 안전하게 확장하기 어렵습니다.

## 해결 목표
**현재:** 저장 유스케이스가 스텁 함수 2개를 직접 의존합니다.  
**목표:** provider/라우터/유스케이스가 공통으로 사용하는 AI 메타데이터 계약 타입을 도입합니다.

## 성공 기준
- [ ] `summary/tags` 생성 결과 타입이 단일 구조(`{ summary, tags }`)로 정의된다.
- [ ] provider 공통 인터페이스(`isAvailable`, `generate`)가 타입으로 고정된다.
- [ ] 에러 표준 타입(`AI_PROVIDER_ERROR`)이 계약에 포함된다.

## 범위 제한
- 실제 provider 구현(Apple/Local/BYOK)은 제외합니다.
- 라우팅 우선순위 로직은 제외합니다.
- UI 상태 변경은 제외합니다.

## 참고 자료
- `src/features/capture/saveKnowledgeItem.types.ts`
- `src/features/capture/stubs.ts`
- 원본 SPEC: `../2026-02-16_ai-metadata-provider-routing.md`
