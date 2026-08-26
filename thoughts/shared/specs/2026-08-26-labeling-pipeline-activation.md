---
date: 2026-08-26
author: loopy
status: complete
type: bug-fix
priority: high
---

# 라벨링 파이프라인 활성화 SPEC

## 문제

새 지식 항목을 저장할 때 라벨링 큐에 등록하는 코드가 없어서, 자동 태깅 파이프라인(규칙 라벨러, 포그라운드/백그라운드 실행기) 전체가 dead code로 작동하지 않는다. 모바일 추천이 태그 중복 기반이므로 라벨·태그가 비면 추천 생성까지 연쇄적으로 마비되어, "AI가 자동 연결"이라는 제품 핵심 가치의 첫 단추가 끊어져 있다.

## 해결 목표

**현재:** 모든 저장 경로가 `labelStatus: null`로 항목을 만들고, 라벨링 큐 조회(`WHERE label_status = 'pending'`)는 항상 빈 결과를 반환한다. 라벨러·라벨링 훅·백그라운드 태스크가 실행돼도 처리할 항목이 없다.

**목표:** 모든 저장 경로에서 항목이 `labelStatus: 'pending'`과 `labelRequestedAt`와 함께 저장되어, 기존 라벨링 실행기(포그라운드 idle 스케줄러, 백그라운드 태스크)가 저장된 항목을 자동으로 처리하고 `provisionalLabels`를 채운다. 모바일 태그 중복 추천이 라벨링 완료 항목에 대해 생성된다.

## 성공 기준

- [x] 네 저장 경로(공유 `save.ts`, 모바일 share processor 텍스트/URL, 데스크톱 CaptureModal) 모두 `labelStatus: 'pending'`, `labelRequestedAt: <저장 시각>`으로 저장하는 단위 테스트 통과
- [x] 통합 테스트: 항목 저장 → `listPendingKnowledgeItemsForLabeling` 조회 → 라벨링 실행 → `labelStatus: 'provisional'` 및 `provisionalLabels` 기록 흐름이 모의 클라이언트에서 통과
- [x] `bun run lint`, `bun test`, `cargo test --workspace` 전체 통과 (기존 테스트 회귀 없음)

## 범위 제한

- 기존에 이미 `labelStatus: null`로 저장된 항목의 백필은 하지 않는다 (미출시 제품, 기존 데이터는 개발 데이터뿐)
- 라벨링 알고리즘 자체(규칙 라벨러 품질, LLM 라벨링 프롬프트)는 변경하지 않는다
- 데스크톱 CaptureModal을 `@glimpse/features`의 `createSaveKnowledgeItem`으로 수렴하는 리팩터링은 별도 작업으로 미룬다 (이번에는 필드만 설정)
- 동기화·그래프 개선(B 영역)은 이 SPEC 범위 밖

## 참고 자료

- 공유 저장 로직: `packages/features/src/capture/save.ts:69` (`labelStatus: null` 기술)
- 큐 조회: `packages/core-rust/src/storage/sqlite/knowledge.rs:167` (`WHERE label_status = 'pending'`, `ORDER BY label_requested_at ASC`)
- 모바일 share processor: `apps/mobile/src/features/share/pending-share-processor.ts:43,76`
- 데스크톱 저장: `apps/desktop/src/components/capture/CaptureModal.tsx:140`
- 라벨링 실행기(정상 동작, 입력만 없음): `apps/desktop/src/features/labeling/run-foreground-labeling.ts`, `apps/mobile/src/features/labeling/runForegroundLabeling.ts` — 처리 후 `labelStatus: 'provisional'` 기록
- 상태 모델: `packages/shared/src/index.ts:46-50`, `packages/core-rust/src/models.rs:101`
- 리서치: `thoughts/shared/research/2026-08-26_15-20-14_next-improvement-opportunities.md` 영역 2
