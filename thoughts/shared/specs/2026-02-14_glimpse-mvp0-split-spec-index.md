---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# Glimpse MVP v0 분할 SPEC 인덱스

## 문제
MVP를 한 번에 구현하면 범위가 너무 커서 진행 속도가 느려지고, 중간 검증 없이 작업이 길어질 위험이 있습니다.

## 해결 목표
**현재:** 비전 문서는 있으나 즉시 착수 가능한 세부 SPEC 단위가 없습니다.
**목표:** 10분 내외로 끝낼 수 있는 작업 단위 SPEC 묶음을 만들어 순차 구현과 빠른 검증이 가능하도록 합니다.

## 성공 기준
- [ ] `MVP v0` 범위(링크 저장, 메모, 기본 자동 태깅/요약, 수동 검색)를 최소 8개 작업 단위로 분해한다.
- [ ] 각 작업 단위 SPEC이 독립적으로 이해 가능하며 완료 기준을 가진다.
- [ ] 각 SPEC이 `package.json`의 현재 기술 스택(Expo Router, React Query, Drizzle/SQLite)과 충돌하지 않는다.

## 범위 제한
- 이번 문서는 구현 코드가 아니라 SPEC 정의만 다룹니다.
- `MVP v1/v2` 상세 설계는 제외하고, `v0` 착수 가능한 범위만 다룹니다.
- Local LLM 모델 선택/BYOK/Apple Intelligence 연동의 세부 기술 검토는 제외합니다.

## 작업 단위 목록 (각 10분 내외)
1. [x] `2026-02-14_mvp0-01-routing-shell.md` - 수집/목록 기본 라우팅 골격 ✅
2. [x] `2026-02-14_mvp0-02-note-capture-form.md` - 메모 입력 폼 ✅
3. [x] `2026-02-14_mvp0-03-link-capture-form.md` - 링크 입력 폼 ✅
4. [x] `2026-02-14_mvp0-04-local-storage-schema.md` - 로컬 저장 스키마 ✅
5. [x] `2026-02-14_mvp0-05-save-usecase-and-meta-stub.md` - 저장 유스케이스 + 요약/태깅 스텁 ✅
6. [x] `2026-02-14_mvp0-06-item-list-screen.md` - 저장 항목 리스트 ✅
7. [x] `2026-02-14_mvp0-07-keyword-search.md` - 키워드 수동 검색 ✅
8. [x] `2026-02-14_mvp0-08-query-style-search.md` - "OO 관련 있어?" 질의형 검색 ✅

## 참고 자료
- 비전/MVP 원문: `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md`
- 기술 기준: `/Users/loopy/dev/ll3/Glimpse/package.json`
