---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: medium
---

# MVP v2-05 반응 기반 간격 조절 규칙 SPEC

## 문제
복습 결과를 일정에 반영하지 않으면 망각곡선 기반 개인화 효과가 없습니다.

## 해결 목표
**현재:** 복습 반응이 이후 간격에 영향을 주지 않습니다.
**목표:** `완료/연기/무시` 반응에 따라 다음 간격을 조절하는 단순 규칙을 적용합니다.

## 성공 기준
- [ ] 반응 타입별 간격 조절 함수가 정의된다.
- [ ] 조절 결과가 `nextReviewAt`에 반영된다.
- [ ] 과도한 빈도 증가/감소를 막는 최소-최대 경계값이 있다.

## 범위 제한
- 머신러닝 기반 정책 학습 제외.
- 사용자별 파라미터 자동 튜닝 제외.
- 장기 A/B 실험 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/2026-02-14_mvp1-08-feedback-event-logging.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/review/adjustIntervalFromFeedback.ts`
