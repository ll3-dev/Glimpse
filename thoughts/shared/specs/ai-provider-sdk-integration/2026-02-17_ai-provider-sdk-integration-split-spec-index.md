---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI Provider SDK Integration 분할 SPEC 인덱스

## 문제
`docs/plans/2026-02-17-ai-provider-sdk-integration.md`는 방향은 명확하지만 단일 문서 기준으로는 실행 단위가 커서 빠른 착수와 검증이 어렵습니다.

## 해결 목표
**현재:** Local/Apple SDK 통합 요구사항이 큰 Plan 문서에 묶여 있습니다.  
**목표:** 10분 내외로 처리 가능한 독립 SPEC 파일로 분해해 순차 구현과 회귀 검증을 쉽게 만듭니다.

## 성공 기준
- [ ] 최소 12개 작업 단위 SPEC으로 분해되어 각 파일이 독립적으로 착수 가능하다.
- [ ] 각 SPEC이 완료 기준(체크리스트)과 참고 파일 경로를 포함한다.
- [ ] 기존 폴더 구조 유지 원칙(새 최상위 디렉터리 미생성)이 명시된다.

## 범위 제한
- 이번 문서는 코드 구현이 아니라 작업 단위 SPEC 분해만 다룹니다.
- BYOK 실SDK 연동/스트리밍/프롬프트 튜닝은 분해 범위에서 제외합니다.
- 신규 최상위 폴더 도입을 전제로 한 설계는 제외합니다.

## 작업 단위 목록 (각 10분 내외)
1. `01-llama-dependency-skeleton.md` - 의존성/스켈레톤 준비
2. `02-llama-service-contract.md` - `llama-service` 계약 타입 고정
3. `03-llama-service-load-generate.md` - 모델 load/generate 핵심 구현
4. `04-local-provider-summary-integration.md` - Local provider 요약 경로 교체
5. `05-local-provider-tags-error.md` - Local tags/에러 매핑 정리
6. `06-apple-native-entry-skeleton.md` - Apple 네이티브 엔트리 스켈레톤
7. `07-apple-native-availability-generate.md` - Apple `isAvailable/generate` 구현
8. `08-apple-bridge-provider-integration.md` - JS bridge + Apple provider 연결
9. `09-router-fallback-hardening.md` - 선택 provider 라우팅/에러 경계 보강
10. `10-settings-store-wiring.md` - settings store와 provider readiness 연결
11. `11-local-apple-provider-tests.md` - Local/Apple provider 테스트 추가
12. `12-router-regression-lint-smoke.md` - 라우터 회귀 + lint/smoke 검증

## 참고 자료
- 원본 Plan: `../../../../docs/plans/2026-02-17-ai-provider-sdk-integration.md`
- 기존 분할 포맷 예시: `../ai-metadata-routing/2026-02-16_ai-metadata-provider-routing-split-spec-index.md`
