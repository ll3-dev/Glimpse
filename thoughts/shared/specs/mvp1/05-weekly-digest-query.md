---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v1-05 주간 다이제스트 조회 SPEC

## 문제
추천 계산 전에 최근 데이터 집합을 안정적으로 조회할 수 있어야 주 1회 추천을 만들 수 있습니다.

## 해결 목표
**현재:** 최근 7일 저장 항목을 묶어 가져오는 전용 조회가 없습니다.
**목표:** 다이제스트용 최근 기간 조회 쿼리를 정의해 추천 단계 입력으로 사용합니다.

## 성공 기준
- [ ] 최근 7일(또는 주간 기준) 데이터 조회 함수가 있다.
- [ ] 타입별 최소 필드(id, type, title/body, tags, createdAt)를 반환한다.
- [ ] 데이터가 없어도 빈 배열로 안정적으로 반환한다.

## 범위 제한
- 추천 순위 산정 제외.
- 사용자별 다중 프로필 분리 제외.
- 주차별 히스토리 저장 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/2026-02-14_mvp0-04-local-storage-schema.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/recommendation/getWeeklyItems.ts`
