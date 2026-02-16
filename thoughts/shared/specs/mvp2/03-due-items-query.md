---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: medium
---

# MVP v2-03 복습 도래 항목 조회 SPEC

## 문제
지금 다시 봐야 할 항목 목록을 가져오지 못하면 복습 큐 UI를 구성할 수 없습니다.

## 해결 목표
**현재:** `nextReviewAt <= now` 조건의 조회가 없습니다.
**목표:** 복습 도래 항목을 정렬/개수 제한과 함께 조회하는 함수를 제공합니다.

## 성공 기준
- [ ] 현재 시각 기준 도래 항목만 조회된다.
- [ ] 오래된 항목 우선 정렬이 가능하다.
- [ ] 빈 결과 시에도 안정적으로 처리된다.

## 범위 제한
- 우선순위 고급 정책 제외.
- 카테고리별 쿼터 분배 제외.
- 클라우드 머지 충돌 처리 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/2026-02-14_mvp2-01-review-state-fields.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/review/getDueItems.ts`
