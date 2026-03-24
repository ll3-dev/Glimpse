---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 09 선택 Provider 라우팅 보강 SPEC

## 문제
Provider 개별 구현이 완료되어도 라우터가 선택된 provider만 정확히 호출하지 않으면 실사용에서 일관성이 깨집니다.

## 해결 목표
**현재:** 선택 기반 정책이 있어도 라우터 회귀 시 다른 provider가 암묵적으로 호출될 위험이 있습니다.  
**목표:** 라우터 readiness 조건과 선택 provider 경계를 명시적으로 고정합니다.

## 성공 기준
- [ ] 선택된 provider만 호출된다.
- [ ] 선택된 provider 실패가 다른 provider 호출 없이 그대로 기록/전달된다.
- [ ] provider 오류가 중간 누락 없이 기록/전달된다.

## 범위 제한
- 새로운 provider 추가는 제외합니다.
- 관찰성 이벤트 스키마 확장은 제외합니다.
- UI 변화는 제외합니다.

## 참고 자료
- `src/features/ai/metadata/router.ts`
- `src/features/ai/providers/*`
