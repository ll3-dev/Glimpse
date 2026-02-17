---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 03 llama-service load/generate 구현 SPEC

## 문제
계약만 있고 런타임 동작이 없으면 Local provider는 실제 생성 경로로 전환할 수 없습니다.

## 해결 목표
**현재:** `llama-service`는 실행 구현이 없습니다.  
**목표:** 모델 path 검증, load/unload, generate 기본 호출을 구현해 문자열 응답을 안정적으로 반환합니다.

## 성공 기준
- [ ] `loadModel(modelPath)`가 path 유효성 검사 후 모델을 로드한다.
- [ ] `generate(prompt, options)`가 기본 옵션과 함께 텍스트를 반환한다.
- [ ] `unloadModel()` 호출 후 loaded 상태가 false가 된다.

## 범위 제한
- 모델 추천/다운로드 목록 관리는 제외합니다.
- 성능 튜닝(속도/메모리 최적화)은 제외합니다.
- provider 통합은 제외합니다.

## 참고 자료
- `src/features/ai/llama-service.ts`
- `src/stores/settings/local-llm.store.ts`

