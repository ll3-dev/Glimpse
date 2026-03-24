---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 05 Local Provider tags/에러 매핑 SPEC

## 문제
요약만 실연동되고 tags/에러 포맷이 정리되지 않으면 선택 provider 경계와 저장 로직이 불안정해집니다.

## 해결 목표
**현재:** tags 생성/파싱과 에러 매핑이 stub 또는 불완전 상태입니다.  
**목표:** tags 생성 경로를 실SDK로 연결하고 Local 실패를 provider 표준 에러로 통일합니다.

## 성공 기준
- [ ] tags 프롬프트 생성과 응답 파싱이 구현된다.
- [ ] SDK 예외가 `aiProviderError` 형태로 매핑된다.
- [ ] 실패 시 선택된 provider 오류로 일관된 실패 결과를 반환한다.

## 범위 제한
- 프롬프트 품질 고도화는 제외합니다.
- 모델 다운로드 UX 개선은 제외합니다.
- Apple provider 수정은 제외합니다.

## 참고 자료
- `src/features/ai/providers/local-llm-provider.ts`
- `src/features/ai/errors/*`
