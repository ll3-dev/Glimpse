---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 11 Local/Apple Provider 테스트 SPEC

## 문제
실SDK 통합 이후 테스트가 없으면 fallback 회귀와 에러 포맷 깨짐을 빠르게 감지할 수 없습니다.

## 해결 목표
**현재:** provider 단위 성공/실패 테스트가 충분하지 않습니다.  
**목표:** Local/Apple provider 각각에 대해 성공 및 실패 경로 테스트를 추가합니다.

## 성공 기준
- [ ] Local provider 성공 케이스(요약/태그) 테스트가 추가된다.
- [ ] Local provider 실패 케이스(모델 없음/SDK 오류) 테스트가 추가된다.
- [ ] Apple provider 성공/실패 케이스 테스트가 추가된다.

## 범위 제한
- e2e/UI 테스트는 제외합니다.
- 성능 벤치마크 테스트는 제외합니다.
- BYOK provider 테스트는 제외합니다.

## 참고 자료
- `src/features/ai/providers/local-llm-provider.test.ts`
- `src/features/ai/providers/apple-provider.test.ts`
- `src/features/ai/metadata/router.test.ts`

