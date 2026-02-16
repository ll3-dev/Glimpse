---
date: 2026-02-16
author: loopy
status: draft
type: feature
priority: high
---

# AI Meta 08 폴백/관측성/테스트 고정 SPEC

## 문제
다중 provider 라우팅은 실패 경로가 많아 테스트 기준과 로깅 규칙이 없으면 회귀를 빠르게 감지하기 어렵습니다.

## 해결 목표
**현재:** 스텁 기반 테스트는 있으나 provider 체인 검증 케이스가 없습니다.  
**목표:** 폴백 우선순위, 실패 로깅, 최소 테스트 세트를 명확히 정의해 안정적으로 확장합니다.

## 성공 기준
- [ ] `Apple -> Local -> BYOK -> Stub` 순서 검증 테스트가 존재한다.
- [ ] provider 실패 원인을 구분 가능한 로깅/에러 코드 기준이 문서화된다.
- [ ] `saveKnowledgeItem` 회귀 테스트가 새로운 provider 계약으로 통과한다.

## 범위 제한
- E2E 자동화 확장은 제외합니다.
- 성능 테스트 자동화는 제외합니다.
- 분석 대시보드 연동은 제외합니다.

## 참고 자료
- `src/features/capture/saveKnowledgeItem.test.ts`
- `src/features/capture/stubs.test.ts`
- `src/utils/logger.ts`
- 원본 SPEC: `../2026-02-16_ai-metadata-provider-routing.md`

