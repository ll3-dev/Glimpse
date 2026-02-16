---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v0-06 저장 항목 리스트 SPEC

## 문제
저장 결과를 즉시 확인할 수 없으면 사용자는 수집 성공 여부를 신뢰하기 어렵습니다.

## 해결 목표
**현재:** 저장된 항목을 확인하는 목록 화면이 없습니다.
**목표:** 최신순으로 메모/링크를 함께 보여주는 최소 리스트 화면을 제공합니다.

## 성공 기준
- [x] 저장된 항목을 최신순으로 렌더링한다.
- [x] 항목별로 타입(메모/링크), 제목(또는 대체 텍스트), 생성일을 표시한다.
- [x] 데이터가 없을 때 빈 상태 UI를 표시한다.

## 범위 제한
- 상세 페이지 이동 제외.
- 무한 스크롤/페이지네이션 제외.
- 그룹핑/고급 정렬 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/package.json` (`@shopify/flash-list`)
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/app/(tabs)/library.tsx`
