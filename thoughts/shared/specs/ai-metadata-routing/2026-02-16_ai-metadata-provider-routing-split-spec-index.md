---
date: 2026-02-16
author: loopy
status: draft
type: feature
priority: high
---

# AI 메타데이터 라우팅 분할 SPEC 인덱스

## 문제
`2026-02-16_ai-metadata-provider-routing.md`는 구현 방향이 명확하지만 단일 문서 기준으로는 한 번에 처리할 범위가 커서 착수 순서와 검증 포인트가 흐려질 수 있습니다.

## 해결 목표
**현재:** Apple/Local/BYOK 라우팅 요구사항이 하나의 큰 SPEC에 묶여 있습니다.  
**목표:** 10분 내외로 끝낼 수 있는 독립 작업 SPEC으로 분리해 순차 구현과 빠른 검증이 가능하도록 합니다.

## 성공 기준
- [ ] 원본 SPEC 범위를 최소 8개 독립 작업 단위로 분리한다.
- [ ] 각 작업 단위가 입력/출력 또는 완료 기준을 명확히 가진다.
- [ ] 각 작업 단위가 현재 코드 구조(`saveKnowledgeItem`, settings store, feature 모듈)와 연결된다.

## 범위 제한
- 이번 문서는 구현 코드가 아니라 작업 단위 SPEC 분해만 다룹니다.
- 모델 품질 벤치마크, 비용 최적화, 프롬프트 튜닝은 제외합니다.
- Web 지원 확장은 제외하고 iOS/Android 중심 분해만 다룹니다.

## 작업 단위 목록 (각 10분 내외)
1. `01-ai-metadata-contract.md` - 공통 타입/인터페이스 계약 정의
2. `02-provider-routing-policy.md` - `Apple -> Local -> BYOK` 라우팅 정책 분리
3. `03-save-usecase-dep-refactor.md` - `saveKnowledgeItem` 의존성 교체 준비
4. `04-apple-provider-adapter.md` - Apple provider 어댑터 초안
5. `05-local-model-config-state.md` - Local LLM 다중 모델 설정 상태 추가
6. `06-local-llm-provider-adapter.md` - Local provider 어댑터 초안
7. `07-byok-provider-adapter.md` - BYOK provider 어댑터 분리
8. `08-fallback-observability-tests.md` - 선택 provider 관측/테스트 기준 고정

## 참고 자료
- 원본 SPEC: `../2026-02-16_ai-metadata-provider-routing.md`
- 저장 유스케이스: `../../../../src/features/capture/saveKnowledgeItem.ts`
- 설정 토글/스토어: `../../../../src/features/settings`, `../../../../src/stores/settings`
