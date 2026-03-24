---
date: 2026-02-16
author: loopy
status: draft
type: feature
priority: medium
---

# AI Meta 07 BYOK Provider 어댑터 SPEC

## 문제
BYOK는 설정 상태만 존재하고 실제 메타데이터 생성 provider 어댑터가 없어 선택 기반 라우팅에 참여할 수 없습니다.

## 해결 목표
**현재:** `enabled/provider/apiKey` 상태만 있고 추론 호출 어댑터가 없습니다.  
**목표:** OpenAI/Anthropic/Google 설정을 공통 provider 계약으로 래핑한 BYOK 어댑터를 정의합니다.

## 성공 기준
- [ ] BYOK 활성/비활성 및 키 유효 상태를 기준으로 `isAvailable`이 동작한다.
- [ ] provider별 호출 결과가 공통 메타데이터 타입으로 정규화된다.
- [ ] 네트워크/응답 실패가 선택된 provider 오류로 해석 가능한 표준 에러로 변환된다.

## 범위 제한
- API 비용 절감 전략은 제외합니다.
- 키 영구 저장(secure storage) 도입은 제외합니다.
- 고급 프롬프트 파라미터 튜닝은 제외합니다.

## 참고 자료
- `src/features/settings/byok.types.ts`
- `src/features/settings/byok.selectors.ts`
- `src/features/settings/byok.validation.ts`
