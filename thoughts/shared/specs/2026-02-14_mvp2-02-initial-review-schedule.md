---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: medium
---

# MVP v2-02 최초 복습 스케줄 계산 SPEC

## 문제
새로 저장된 항목의 첫 복습 시점을 정하지 않으면 "다시 보기" 흐름이 시작되지 않습니다.

## 해결 목표
**현재:** 신규 항목은 복습 일정이 비어 있습니다.
**목표:** 저장 시점에 기본 복습 간격(예: 1일)으로 `nextReviewAt`을 설정합니다.

## 성공 기준
- [ ] 신규 항목 저장 시 초기 복습 일정이 자동 설정된다.
- [ ] 타입(메모/링크/하이라이트)에 따라 동일 규칙 또는 명시된 규칙이 적용된다.
- [ ] 과거 데이터에도 초기화 함수로 일괄 적용 가능하다.

## 범위 제한
- 개인별 난이도 추정 제외.
- 컨텐츠 길이 기반 동적 간격 제외.
- 알림 예약 트리거 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/2026-02-14_mvp2-01-review-state-fields.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/review/initializeReviewSchedule.ts`
