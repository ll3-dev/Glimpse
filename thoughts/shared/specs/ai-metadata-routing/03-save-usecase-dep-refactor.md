---
date: 2026-02-16
author: loopy
status: draft
type: feature
priority: high
---

# AI Meta 03 saveKnowledgeItem 의존성 교체 SPEC

## 문제
`saveKnowledgeItem`은 현재 스텁 함수 2개를 직접 호출하므로 provider 라우팅 결과를 주입할 수 없습니다.

## 해결 목표
**현재:** `generateSummaryStub`, `generateTagsStub` 직접 호출 구조입니다.  
**목표:** `generateMetadata(input)` 단일 의존성으로 교체해 라우터 결과를 저장 페이로드에 연결합니다.

## 성공 기준
- [ ] `SaveKnowledgeItemDeps`에서 스텁 의존성이 단일 메타데이터 생성 의존성으로 변경된다.
- [ ] 저장 성공/실패 계약을 유지한 채 `summary/tags` 주입 경로가 교체된다.
- [ ] 기존 테스트가 새로운 의존성 시그니처에 맞게 갱신된다.

## 범위 제한
- 라우터 구현 상세는 제외합니다.
- DB 스키마/마이그레이션 변경은 제외합니다.
- 추천 기능 연계 변경은 제외합니다.

## 참고 자료
- `src/features/capture/saveKnowledgeItem.ts`
- `src/features/capture/saveKnowledgeItem.types.ts`
- `src/features/capture/saveKnowledgeItem.test.ts`

