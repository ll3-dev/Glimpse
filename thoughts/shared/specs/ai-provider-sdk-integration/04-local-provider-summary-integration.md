---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 04 Local Provider 요약 경로 통합 SPEC

## 문제
Local provider가 stub 요약을 반환하면 실제 온디바이스 생성 품질을 검증할 수 없습니다.

## 해결 목표
**현재:** `local-llm-provider.ts` 요약 생성이 stub 중심입니다.  
**목표:** summary 생성 경로를 `llamaService.generate` 기반으로 바꿔 실제 모델 출력을 사용합니다.

## 성공 기준
- [ ] readiness 체크 실패 시 표준 에러를 반환한다.
- [ ] summary 프롬프트를 구성해 `llamaService.generate`를 호출한다.
- [ ] 성공 시 `summary`가 trim된 문자열로 반환된다.

## 범위 제한
- tags 생성 경로는 제외합니다.
- 라우터 우선순위 조정은 제외합니다.
- UI 변경은 제외합니다.

## 참고 자료
- `src/features/ai/providers/local-llm-provider.ts`
- `src/features/ai/metadata/prompts/*` (있을 경우)

