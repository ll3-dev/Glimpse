---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: medium
---

# MVP v0-08 질의형 검색("OO 관련 있어?") SPEC

## 문제
사용자는 키워드 검색보다 질문형 인터페이스를 선호할 수 있으며, 이는 제품의 AI 지향 경험을 초기부터 보여주는 신호가 됩니다.

## 해결 목표
**현재:** 질문형 텍스트 입력을 검색으로 해석하는 규칙이 없습니다.
**목표:** "OO 관련", "OO 있어" 같은 패턴에서 핵심 키워드를 추출해 기존 키워드 검색으로 연결합니다.

## 성공 기준
- [x] 질문형 입력에서 검색 키워드를 추출하는 최소 파서가 동작한다.
- [x] 파서 실패 시 전체 문장을 키워드로 사용해 검색이 수행된다.
- [x] 기존 키워드 검색과 동일한 결과 리스트 컴포넌트를 재사용한다.

## 범위 제한
- LLM 기반 자연어 이해 제외.
- 다국어 질의 처리 제외.
- 추천 답변 생성(설명문/근거문) 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/package.json`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/search/parseQueryToKeyword.ts`
