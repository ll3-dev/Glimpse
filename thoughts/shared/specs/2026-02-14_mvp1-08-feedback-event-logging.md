---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v1-08 추천 반응 이벤트 저장 SPEC

## 문제
수락/무시 결과가 남지 않으면 v2의 빈도 조절/개인화 개선에 필요한 학습 데이터가 없습니다.

## 해결 목표
**현재:** 추천 반응 이벤트를 구조화해 저장하지 않습니다.
**목표:** 추천 ID, 액션 타입, 시간 정보를 로컬 이벤트 로그로 저장합니다.

## 성공 기준
- [ ] `accepted/ignored` 반응이 이벤트 테이블(또는 동등 구조)에 저장된다.
- [ ] 각 이벤트에 추천 식별자와 타임스탬프가 포함된다.
- [ ] 최근 반응 조회 함수가 제공된다.

## 범위 제한
- 서버 업로드/분석 파이프라인 제외.
- A/B 테스트 키 관리 제외.
- 이벤트 정합성 복구 배치 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/2026-02-14_mvp1-07-digest-ui-accept-ignore.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/recommendation/logRecommendationFeedback.ts`
