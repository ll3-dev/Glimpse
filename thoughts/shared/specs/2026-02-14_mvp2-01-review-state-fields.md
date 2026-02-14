---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: medium
---

# MVP v2-01 복습 상태 필드 확장 SPEC

## 문제
망각 곡선 추천을 위해 항목별 복습 상태를 저장할 데이터 필드가 필요합니다.

## 해결 목표
**현재:** 항목에 복습 간격/다음 복습 시점 정보가 없습니다.
**목표:** `stability`, `difficulty`, `lastReviewedAt`, `nextReviewAt` 필드를 추가합니다.

## 성공 기준
- [ ] 복습 상태 필드가 스키마에 정의된다.
- [ ] 기존 데이터와 호환되는 기본값 전략이 있다.
- [ ] 조회 시 필드 누락으로 인한 런타임 오류가 발생하지 않는다.

## 범위 제한
- 고급 메모리 모델(FSRS 완전 구현) 제외.
- 대규모 마이그레이션 툴링 제외.
- 서버 사이드 동기화 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/2026-02-14_mvp0-04-local-storage-schema.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/db/schema.ts`
