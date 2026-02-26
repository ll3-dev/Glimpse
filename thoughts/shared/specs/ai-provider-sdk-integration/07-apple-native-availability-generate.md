---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 07 Apple `isAvailable/generate` 구현 SPEC

## 문제
네이티브 모듈 스켈레톤만으로는 실제 Apple Intelligence 실행 여부와 생성 결과를 확인할 수 없습니다.

## 해결 목표
**현재:** Apple 네이티브 경로에 실동작 함수가 없습니다.  
**목표:** `@available` 가드 기반 `isAvailable`과 단일 `generate(prompt)` 응답 함수를 구현합니다.

## 성공 기준
- [ ] 미지원 iOS 버전에서 `isAvailable`이 false를 반환한다.
- [ ] 지원 환경에서 `generate(prompt)`가 문자열 응답을 반환한다.
- [ ] 네이티브 오류가 JS에서 처리 가능한 코드/메시지로 전달된다.

## 범위 제한
- 스트리밍 응답은 제외합니다.
- 요약/태그 전용 프롬프트 분리는 제외합니다.
- Android Apple 대체 경로 구현은 제외합니다.

## 참고 자료
- `ios/glimpse/*` (Apple 모듈 구현 파일)
- `src/features/ai/providers/apple-provider.ts`

