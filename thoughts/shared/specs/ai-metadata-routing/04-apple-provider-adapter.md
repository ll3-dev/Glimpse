---
date: 2026-02-16
author: loopy
status: draft
type: feature
priority: medium
---

# AI Meta 04 Apple Provider 어댑터 SPEC

## 문제
Apple Intelligence 토글은 존재하지만 실제 메타데이터 생성 provider로 연결되지 않아 온디바이스 경로를 활용할 수 없습니다.

## 해결 목표
**현재:** Apple 관련 로직은 가용성 체크/토글까지만 존재합니다.  
**목표:** 공통 provider 인터페이스를 따르는 Apple 어댑터를 추가해 라우터가 호출 가능하도록 합니다.

## 성공 기준
- [ ] Apple provider가 `isAvailable`에서 플랫폼/버전/토글 상태를 평가한다.
- [ ] Apple provider가 `generate` 결과를 공통 메타데이터 타입으로 반환한다.
- [ ] Apple 실패 시 라우터가 다음 provider로 폴백할 수 있는 에러 형태를 반환한다.

## 범위 제한
- Apple 모델 품질 튜닝/프롬프트 최적화는 제외합니다.
- Apple 전용 UI 개선은 제외합니다.
- macOS 전용 시나리오 확장은 제외합니다.

## 참고 자료
- `src/features/settings/appleIntelligence.version.ts`
- `src/features/settings/appleIntelligenceToggle.ts`
- 원본 SPEC: `../2026-02-16_ai-metadata-provider-routing.md`

