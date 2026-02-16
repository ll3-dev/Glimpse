---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v1-06 연결 추천 규칙 스텁 SPEC

## 문제
추천 엔진이 비어 있으면 다이제스트에 제안할 연결 쌍을 만들 수 없습니다.

## 해결 목표
**현재:** 저장 항목 간 연결 후보를 계산하는 규칙이 없습니다.
**목표:** 태그 겹침/키워드 겹침 기반의 단순 규칙으로 연결 후보를 생성합니다.

## 성공 기준
- [ ] 입력 항목 집합에서 연결 후보 쌍을 생성한다.
- [ ] 동일 항목 자기참조/중복 쌍을 제거한다.
- [ ] 각 후보에 최소 점수(score)와 근거(reason)를 포함한다.

## 범위 제한
- LLM 기반 의미 유사도 계산 제외.
- 임베딩/벡터DB 연동 제외.
- 개인화 랭킹 최적화 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/recommendation/buildLinkCandidates.ts`
