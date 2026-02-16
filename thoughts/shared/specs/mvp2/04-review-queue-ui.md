---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: medium
---

# MVP v2-04 다시 보기 큐 UI SPEC

## 문제
복습 추천이 계산되어도 사용자에게 노출할 화면이 없으면 기능을 체감할 수 없습니다.

## 해결 목표
**현재:** 복습 항목을 보여주고 반응을 수집하는 전용 UI가 없습니다.
**목표:** 도래 항목 목록과 "다시 봄/나중에" 액션을 제공하는 큐 화면을 만듭니다.

## 성공 기준
- [ ] 도래 항목 리스트가 표시된다.
- [ ] 항목별 최소 액션(완료/연기)이 동작한다.
- [ ] 액션 이후 리스트 상태가 즉시 갱신된다.

## 범위 제한
- 카드 학습 모드/플래시카드 애니메이션 제외.
- 상세 편집 화면 진입 제외.
- 푸시 알림 연동 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/2026-02-14_mvp2-03-due-items-query.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/app/(tabs)/review.tsx`
