---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v0-07 키워드 수동 검색 SPEC

## 문제
저장량이 늘어나면 리스트만으로 원하는 정보를 찾기 어려워집니다.

## 해결 목표
**현재:** 사용자가 저장 항목에서 키워드 기반으로 필터링할 수 없습니다.
**목표:** 제목/본문/태그를 대상으로 하는 기본 키워드 검색을 제공합니다.

## 성공 기준
- [x] 검색 입력값에 따라 리스트 결과가 실시간 또는 제출 기반으로 갱신된다.
- [x] 제목/본문/태그 중 하나라도 매칭되면 결과에 포함된다.
- [x] 검색어가 비어 있으면 전체 목록을 보여준다.

## 범위 제한
- 형태소 분석/NLP 검색 제외.
- 고급 필터(기간, 타입 다중 선택) 제외.
- 서버 검색/벡터 검색 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/package.json`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/search/filterKnowledgeItems.ts`
