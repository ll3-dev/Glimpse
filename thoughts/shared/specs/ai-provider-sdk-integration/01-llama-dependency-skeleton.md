---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 01 llama 의존성/스켈레톤 준비 SPEC

## 문제
Local LLM 경로를 실제로 붙이려면 SDK 의존성과 최소 파일 골격이 먼저 필요합니다.

## 해결 목표
**현재:** Local provider는 stub 구조이고 실행 서비스 파일이 없습니다.  
**목표:** `llama.rn` 의존성을 추가하고 `llama-service`/`apple-intelligence-bridge` 스켈레톤을 import 가능한 상태로 만듭니다.

## 성공 기준
- [ ] `package.json`에 `llama.rn`이 추가된다.
- [ ] `src/features/ai/llama-service.ts` 스켈레톤이 생성된다.
- [ ] `src/features/ai/apple-intelligence-bridge.ts` 스켈레톤이 생성된다.

## 범위 제한
- 실제 모델 로드/생성 로직은 제외합니다.
- 네이티브 Apple 구현은 제외합니다.
- 테스트 추가는 제외합니다.

## 참고 자료
- `package.json`
- `src/features/ai/providers/local-llm-provider.ts`
- `src/features/ai/providers/apple-provider.ts`

