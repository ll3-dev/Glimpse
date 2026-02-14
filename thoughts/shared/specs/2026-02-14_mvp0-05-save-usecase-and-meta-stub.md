---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v0-05 저장 유스케이스 + 메타 스텁 SPEC

## 문제
입력 폼과 저장소 사이를 연결하는 유스케이스가 없으면 실제 사용자 흐름이 완성되지 않습니다.

## 해결 목표
**현재:** 폼 입력값을 정규화해서 저장하고 후처리(요약/태깅)하는 공통 흐름이 없습니다.
**목표:** 저장 유스케이스에서 기본 정규화 후 `요약/태그 생성 스텁`을 거쳐 저장까지 완료합니다.

## 성공 기준
- [x] 메모/링크 입력을 단일 저장 함수로 처리한다.
- [x] 저장 시 `summary`, `tags`를 채우는 로컬 스텁 로직이 동작한다.
- [x] 저장 성공/실패 결과를 UI가 소비할 수 있는 형태로 반환한다.

## 범위 제한
- 실제 Local LLM 추론 엔진 연결 제외.
- 원격 API 호출/BYOK 연결 제외.
- 추천 알고리즘(연결 추천/망각곡선) 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/package.json` (`expo-network`, 향후 모델 분기 대비)
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/capture/saveKnowledgeItem.ts`
