---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v0-03 링크 입력 폼 SPEC

## 문제
MVP의 첫 입력 채널인 링크 저장이 불가능하면 외부 지식 아카이빙 가치가 사라집니다.

## 해결 목표
**현재:** URL을 입력하고 저장 요청할 수 있는 화면/검증이 없습니다.
**목표:** URL + 짧은 메모를 입력해 링크 항목을 저장 요청할 수 있게 합니다.

## 성공 기준
- [x] URL 입력 필드가 있고 기본 형식 검증을 수행한다.
- [x] 선택 입력인 메모 필드를 제공한다.
- [x] 저장 버튼 탭 시 링크 저장 유스케이스 호출 이벤트가 발생한다.

## 범위 제한
- 웹 페이지 메타데이터(제목/썸네일) 크롤링 제외.
- 북마크 중복 병합 로직 제외.
- 브라우저 확장 기능/공유시트 연동 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/package.json`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/app/(tabs)/collect.tsx`
