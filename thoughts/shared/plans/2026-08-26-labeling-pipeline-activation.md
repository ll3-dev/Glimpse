# 라벨링 파이프라인 활성화 구현 계획

## 개요

모든 지식 항목 저장 경로가 `labelStatus: 'pending'` + `labelRequestedAt`와 함께 항목을 등록하도록 수정해, 기존에 완비되어 있지만 입력이 없어 작동하지 않던 라벨링 파이프라인(포그라운드 스케줄러, 백그라운드 태스크, 규칙/LLM 라벨러)을 활성화한다. 이로써 태그 기반 모바일 추천의 연쇄 마비도 함께 해소된다.

## 현재 상태 분석

- 공유 저장 로직 `packages/features/src/capture/save.ts:69-71`이 `labelStatus: null`, `labelRequestedAt: null` 등으로 항목 생성 — 모바일과 packages/features 소비자 전체가 이 경로를 씀
- 모바일 share processor `apps/mobile/src/features/share/pending-share-processor.ts:43,76`(텍스트/URL 두 지점)가 직접 항목을 만들며 `labelStatus: null`
- 데스크톱 CaptureModal `apps/desktop/src/components/capture/CaptureModal.tsx:138-146`이 UI에서 직접 항목을 만들며 `labelStatus: null`
- 큐 조회 `packages/core-rust/src/storage/sqlite/knowledge.rs:167`는 `WHERE label_status = 'pending' ORDER BY label_requested_at ASC` — 등록만 되면 즉시 소비 가능
- 실행기는 이미 정상: 데스크톱 `run-foreground-labeling.ts`(규칙 라벨러, `labelStatus: 'provisional'` 기록), 모바일 `runForegroundLabeling.ts`(AI 타겟 라우팅), 백그라운드 태스크·훅 배선(`useForegroundLabeling` → `createRunForegroundLabeling`) 모두 존재
- 상태 타입은 `packages/shared/src/index.ts:46-50`에 `KnowledgeItemLabelStatus`로 정의됨 ('pending' 포함)
- 테스트 관례: `apps/mobile/src/features/core/application/capture/index.test.ts`가 bun:test + mock deps 패턴으로 `createSaveKnowledgeItem`을 이미 테스트 중 — 여기에 케이스 추가

### 주요 발견사항:
- 저장 시점에 이미 `now = Date.now()`가 계산되어 있으므로 `labelRequestedAt: now`를 재사용하면 된다 (save.ts:57)
- share processor는 `createdAt: Date.now()`를 인라인 호출 — 두 지점 모두 동일 필드 수정
- 데스크톱 CaptureModal은 검증 실패/성공 경로에서 항목 필드만 바꾸면 되고 저장 흐름 변경 불필요
- `labelStatus: 'pending'` 저장 시 Rust 저장 계층이 plain 문자열로 직렬화하므로(knowledge.rs:33-34 주석) WHERE 절과 정합 — Rust 쪽 변경 불필요

## 목표 상태

네 저장 경로에서 만들어지는 모든 항목이 `labelStatus: 'pending'`, `labelRequestedAt: <저장시각>`으로 저장된다. 앱 실행 직후 포그라운드 라벨러가 저장된 항목을 조회해 라벨을 붙이고, `labelStatus: 'provisional'` + `provisionalLabels`가 기록되어 태그 기반 추천이 생성된다.

## 범위 제한 (하지 않을 것)

- 기존 `labelStatus: null` 항목 백필 마이그레이션 없음
- 라벨러 알고리즘·프롬프트 변경 없음
- CaptureModal을 `createSaveKnowledgeItem`으로 수렴하는 리팩터링 없음 (필드만 수정)
- 동기화·그래프 영역(B) 미포함

## 구현 접근 방식

순수 필드 설정 변경 4곳 + 저장→라벨링 흐름 단위/통합 테스트. Rust 코드는 불필요 — 저장 계층이 이미 pending 상태를 지원하고 큐 조회가 이미 존재함. 각 파일 수정 후 즉시 테스트로 검증하고 마지막에 전체 게이트를 돌린다.

## Phase 1: 저장 경로 4곳에 pending 등록

### 개요
모든 항목 생성 지점에 라벨링 큐 등록 필드를 설정한다.

### 필요한 변경사항:

#### 1. 공유 저장 로직
**파일**: `packages/features/src/capture/save.ts`
**변경사항**: `labelStatus: null` → `labelStatus: 'pending'`, `labelRequestedAt: null` → `labelRequestedAt: now`

```ts
labels: null, provisionalLabels: null, labelStatus: 'pending', labelSource: null,
labelVersion: null, labelScore: null,
labelRequestedAt: now, labelCompletedAt: null, labelError: null,
```

#### 2. 모바일 share processor (2곳)
**파일**: `apps/mobile/src/features/share/pending-share-processor.ts`
**변경사항**: 텍스트 지점(:43 부근)과 URL 지점(:76 부근) 모두 `labelStatus: 'pending'`, `labelRequestedAt: Date.now()`로. 두 지점 모두 `createdAt: Date.now()`를 이미 인라인 호출하므로 같은 패턴으로.

#### 3. 데스크톱 CaptureModal
**파일**: `apps/desktop/src/components/capture/CaptureModal.tsx`
**변경사항**: `labelStatus: null` → `labelStatus: 'pending'`, `labelRequestedAt: null` → `labelRequestedAt: now` (now는 :123에서 이미 정의)

### 성공 기준:

#### 자동 검증:
- [ ] `bun test apps/mobile/src/features/core/application/capture` 통과 (기존+신규 케이스)
- [ ] `bun run lint` 통과
- [ ] `bun run typecheck` 통과 (pending 리터럴 타입 정합)

#### 수동 검증:
- [ ] 데스크톱 캡처 모달에서 항목 저장 후 Library 목록에 표시
- [ ] 저장 후 수 초 내 라벨링 실행 (750ms 지연 후 포그라운드 라벨러) 으로 항목에 라벨/태그 부착 확인

## Phase 2: 저장→라벨링 흐름 테스트

### 개요
SPEC 성공 기준의 단위/통합 테스트를 추가해 회귀를 방지한다.

### 필요한 변경사항:

#### 1. 저장 시 pending 등록 단위 테스트
**파일**: `apps/mobile/src/features/core/application/capture/index.test.ts` (기존 파일에 추가)
**변경사항**: `createSaveKnowledgeItem`이 `labelStatus: 'pending'`과 `labelRequestedAt`를 설정하는지 검증하는 mock 기반 테스트 추가. 기존 `createSaveKnowledgeItem short-circuits validation failures` 케이스 바로 뒤에 배치.

#### 2. 저장→큐→라벨링 통합 테스트
**파일**: `apps/mobile/src/features/labeling/runForegroundLabeling.test.ts` (존재 확인됨) 또는 동일 디렉토리 신규 파일
**변경사항**: 모의 coreClient로 `saveKnowledgeItem`이 만든 항목 → `listPendingKnowledgeItemsForLabeling` 반환 → 라벨링 실행 → `updateKnowledgeItem`이 `labelStatus: 'provisional'`로 호출되는 흐름 검증. 실행기 소비 측만 검증하되 저장측 항목을 그대로 입력으로 사용.

#### 3. share processor 저장 테스트
**파일**: `apps/mobile/src/features/share/` 하위 신규 `pending-share-processor.test.ts`
**변경사항**: 텍스트/URL 공유가 각각 `labelStatus: 'pending'` 항목을 저장하는지 mock coreClient로 검증.

### 성공 기준:

#### 자동 검증:
- [ ] `bun test` 전체 통과 (신규 테스트 포함, 기존 회귀 없음)
- [ ] `cargo test --workspace` 변화 없음 통과 확인 (Rust 미변경이므로)
- [ ] `bun run desktop:typecheck` 통과 (CaptureModal 변경)

## Phase 3: 전체 게이트 및 마무리

### 개요
전체 검증 후 커밋한다.

### 성공 기준:

#### 자동 검증:
- [ ] `bun run lint` 통과
- [ ] `bun test` 통과
- [ ] `cargo test --workspace` 통과
- [ ] SPEC 성공 기준 체크박스 갱신 및 status: complete로 변경

#### 수동 검증:
- [ ] 데스크톱/모바일 앱에서 실제 저장→자동 라벨링 확인 (별도 GUI 검증 세션에서)

## 테스트 전략

### 단위 테스트:
- 저장 시 `labelStatus: 'pending'` + `labelRequestedAt` 설정 (4경로 각각)
- validation 실패 시 이전과 동일하게 큐 미등록 (short-circuit 유지)

### 통합 테스트:
- 저장된 항목이 pending 큐 조회로 반환되고 라벨링 후 provisional로 전이

### 수동 테스트 단계:
1. 데스크톱 CaptureModal에서 노트 저장 → Library에서 라벨 부착 확인
2. 모바일 공유 시트로 URL 공유 → pending 등록 후 라벨링 확인
3. Library/Digest에서 태그 기반 추천 생성 확인

## 성능 고려사항

필드 설정만 추가되므로 성능 영향 없음. 기존 라벨러가 규칙 기반(동기적, 가벼움)이고 모바일 AI 타겟 라우팅도 fallback이 규칙 라벨러라 안전.

## 마이그레이션 참고사항

기존 데이터 백필 없음 — 미출시 제품의 개발 데이터만 존재. 추후 백필이 필요하면 `UPDATE knowledge_items SET label_status = 'pending', label_requested_at = strftime('%s','now')*1000 WHERE label_status IS NULL AND labels IS NULL` 형태의 일회성 스크립트로 가능하다고만 기록.

## 참고 자료

- SPEC: `thoughts/shared/specs/2026-08-26-labeling-pipeline-activation.md`
- 리서치: `thoughts/shared/research/2026-08-26_15-20-14_next-improvement-opportunities.md`
- 기존 테스트 패턴: `apps/mobile/src/features/core/application/capture/index.test.ts`
- 큐 조회 SQL: `packages/core-rust/src/storage/sqlite/knowledge.rs:167`
