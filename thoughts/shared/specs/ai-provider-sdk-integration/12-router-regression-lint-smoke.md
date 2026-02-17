---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 12 라우터 회귀 + lint/smoke 검증 SPEC

## 문제
개별 단위 구현이 끝나도 최종 검증 단계가 없으면 통합 시점의 회귀를 놓치기 쉽습니다.

## 해결 목표
**현재:** 검증 항목이 문서/수동 확인에 흩어져 있습니다.  
**목표:** 라우터 회귀 테스트 + lint + 플랫폼 스모크를 고정된 종료 게이트로 정의합니다.

## 성공 기준
- [ ] `router.test.ts`에서 Apple/Local/Stub 우선순위 체인이 통과한다.
- [ ] `bun run lint`가 통과한다.
- [ ] `bun run ios` 또는 `bun run web` 스모크 1회가 완료된다.

## 범위 제한
- 실패 원인 디버깅 상세 절차는 제외합니다.
- CI 파이프라인 변경은 제외합니다.
- 릴리즈 노트 작성은 제외합니다.

## 참고 자료
- `src/features/ai/metadata/router.test.ts`
- `package.json` (scripts)
- `docs/plans/2026-02-17-ai-provider-sdk-integration.md`

