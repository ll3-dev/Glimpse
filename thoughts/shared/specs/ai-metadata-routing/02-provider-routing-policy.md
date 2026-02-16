---
date: 2026-02-16
author: loopy
status: draft
type: feature
priority: high
---

# AI Meta 02 Provider 라우팅 정책 SPEC

## 문제
Apple/Local/BYOK를 모두 지원하려면 우선순위와 실패 처리 기준이 코드 곳곳에 흩어지지 않게 중앙 라우터 정책으로 고정되어야 합니다.

## 해결 목표
**현재:** provider 선택 로직이 명시적으로 존재하지 않습니다.  
**목표:** `Apple -> Local -> BYOK` 순서와 폴백 규칙을 단일 라우터 정책으로 정의합니다.

## 성공 기준
- [ ] 라우팅 입력(플랫폼/설정/콘텐츠)과 출력(선택 provider/메타데이터)이 정의된다.
- [ ] provider 실패 시 다음 provider로 이동하는 기준이 문서화된다.
- [ ] 모든 provider 실패 시 최종 스텁 폴백 규칙이 포함된다.

## 범위 제한
- provider 내부 API 호출 구현은 제외합니다.
- BYOK API 키 검증 규칙 변경은 제외합니다.
- 저장 유스케이스 연결 코드는 제외합니다.

## 참고 자료
- `src/features/settings/appleIntelligence.service.ts`
- `src/features/settings/byok.selectors.ts`
- `src/features/settings/byok.commands.ts`

