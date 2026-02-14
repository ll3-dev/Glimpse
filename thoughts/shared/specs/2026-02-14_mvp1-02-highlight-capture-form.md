---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v1-02 하이라이트 입력 폼 SPEC

## 문제
읽는 중 핵심 구절을 빠르게 저장하는 흐름이 없으면 v1 입력 채널 확장 목표를 달성할 수 없습니다.

## 해결 목표
**현재:** 하이라이트 전용 입력 구조가 없습니다.
**목표:** 원문 일부 텍스트와 출처(옵션)를 저장 요청할 수 있는 하이라이트 폼을 제공합니다.

## 성공 기준
- [ ] 하이라이트 텍스트 입력 필드가 있다.
- [ ] 출처 URL 또는 제목을 선택 입력으로 받는다.
- [ ] 저장 시 `type=highlight` 항목으로 유스케이스가 호출된다.

## 범위 제한
- 웹/전자책 직접 선택 복사 연동 제외.
- 하이라이트 구간 위치(offset) 추적 제외.
- 중복 하이라이트 병합 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/capture/highlightForm.tsx`
