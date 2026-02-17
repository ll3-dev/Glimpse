---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 02 llama-service 계약 정의 SPEC

## 문제
서비스 인터페이스가 먼저 고정되지 않으면 provider와 테스트가 각각 다른 가정으로 구현될 수 있습니다.

## 해결 목표
**현재:** Local LLM 호출 계약이 파일별로 암묵적입니다.  
**목표:** `llama-service.ts`에 모델 라이프사이클/생성 옵션 타입을 명시해 호출 규약을 고정합니다.

## 성공 기준
- [ ] `loadModel`, `isModelLoaded`, `generate`, `unloadModel` 인터페이스가 정의된다.
- [ ] `GenerateOptions` 타입(`maxTokens`, `temperature`, `topP`, `stopTokens`)이 정의된다.
- [ ] provider 파일에서 계약 타입 import가 가능하다.

## 범위 제한
- 실제 SDK 바인딩 구현은 제외합니다.
- 모델 다운로드 UI 로직은 제외합니다.
- 라우터 변경은 제외합니다.

## 참고 자료
- `src/features/ai/llama-service.ts`
- `src/features/ai/providers/local-llm-provider.ts`

