---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 09 라우터 폴백 체인 보강 SPEC

## 문제
Provider 개별 구현이 완료되어도 라우터가 우선순위/폴백을 정확히 지키지 않으면 실사용에서 일관성이 깨집니다.

## 해결 목표
**현재:** `Apple -> Local -> BYOK -> Stub` 정책은 있으나 실SDK 실패 케이스 회귀 위험이 있습니다.  
**목표:** 라우터 readiness 조건과 폴백 체인을 명시적으로 고정합니다.

## 성공 기준
- [ ] Apple 성공 시 Local/Stub을 호출하지 않는다.
- [ ] Apple 실패 시 Local로, Local 실패 시 Stub으로 정확히 폴백한다.
- [ ] provider 오류가 체인 중간에서 누락되지 않고 기록/전달된다.

## 범위 제한
- 새로운 provider 추가는 제외합니다.
- 관찰성 이벤트 스키마 확장은 제외합니다.
- UI 변화는 제외합니다.

## 참고 자료
- `src/features/ai/metadata/router.ts`
- `src/features/ai/providers/*`

