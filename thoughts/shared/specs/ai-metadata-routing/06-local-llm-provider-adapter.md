---
date: 2026-02-16
author: loopy
status: draft
type: feature
priority: high
---

# AI Meta 06 Local LLM Provider 어댑터 SPEC

## 문제
Local 모델 설정이 있어도 공통 provider 인터페이스를 따르는 실행 어댑터가 없으면 실제 추론 라우팅에 참여할 수 없습니다.

## 해결 목표
**현재:** Local LLM 실행 provider가 존재하지 않습니다.  
**목표:** `react-native-llm` 기반 Local provider 어댑터를 추가해 iOS/Android 공통 라우팅에 연결합니다.

## 성공 기준
- [ ] Local provider가 모델 선택 상태를 읽어 사용 가능 여부를 판단한다.
- [ ] Local provider가 요약/태그 결과를 공통 메타데이터 타입으로 반환한다.
- [ ] Local 실패 시 라우터가 BYOK로 폴백할 수 있는 실패 결과를 반환한다.

## 범위 제한
- 모델 성능 비교/벤치마크는 제외합니다.
- Local 모델 자동 업데이트는 제외합니다.
- Web Local LLM 지원은 제외합니다.

## 참고 자료
- `src/features/settings/*`
- `src/features/capture/saveKnowledgeItem.ts`
- 원본 SPEC: `../2026-02-16_ai-metadata-provider-routing.md`

