---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 08 Apple bridge/provider 통합 SPEC

## 문제
네이티브 함수가 있어도 JS bridge와 provider를 연결하지 않으면 라우터가 Apple 경로를 사용할 수 없습니다.

## 해결 목표
**현재:** `apple-provider.ts`는 stub 동작 또는 부분 연결 상태입니다.  
**목표:** `apple-intelligence-bridge.ts`와 `apple-provider.ts`를 연결해 summary/tags를 실응답 기반으로 반환합니다.

## 성공 기준
- [ ] `requireNativeModule` 기반 bridge가 `isAvailable/generate`를 호출한다.
- [ ] Apple provider summary/tags 경로가 bridge 호출 결과를 사용한다.
- [ ] 실패 시 provider 표준 에러로 반환해 라우터 폴백이 가능하다.

## 범위 제한
- provider 라우터 우선순위 조정은 제외합니다.
- Apple 설정 UI 개선은 제외합니다.
- 프롬프트 튜닝은 제외합니다.

## 참고 자료
- `src/features/ai/apple-intelligence-bridge.ts`
- `src/features/ai/providers/apple-provider.ts`

