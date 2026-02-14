---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: medium
---

# MVP v2-06 추천 빈도 자동 조절 SPEC

## 문제
추천이 너무 잦거나 드물면 사용자 경험이 저하되어 추천 기능 자체를 무시하게 됩니다.

## 해결 목표
**현재:** 추천 노출 빈도가 고정 또는 명시되지 않았습니다.
**목표:** 최근 반응률 기반으로 다음 추천 노출 주기(예: 3일/7일/14일)를 조절합니다.

## 성공 기준
- [ ] 최근 반응률을 계산하는 함수가 있다.
- [ ] 반응률 구간별로 추천 주기가 결정된다.
- [ ] 결정된 주기를 저장하고 다음 추천 시점 계산에 사용한다.

## 범위 제한
- 고급 통계 모델 제외.
- 사용자 수동 세밀 조정 UI 제외.
- 서버 실시간 실험/원격 설정 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/2026-02-14_mvp1-08-feedback-event-logging.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/recommendation/updateRecommendationCadence.ts`
