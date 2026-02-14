---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: medium
---

# MVP v2-07 BYOK 설정 스텁 SPEC

## 문제
파워 유저를 위한 BYOK 옵션이 없으면 v2 비전의 확장성과 사용자 통제 메시지가 약해집니다.

## 해결 목표
**현재:** 사용자 API 키를 저장/활성화하는 최소 설정 구조가 없습니다.
**목표:** BYOK on/off, provider, masked key 저장이 가능한 설정 스텁을 제공합니다.

## 성공 기준
- [ ] BYOK 활성화 토글과 키 입력 저장이 가능하다.
- [ ] UI에서는 키가 마스킹되어 표시된다.
- [ ] 키 미입력 상태에서 BYOK 활성화 시 검증 메시지를 표시한다.

## 범위 제한
- 실제 외부 LLM API 호출 제외.
- 키 암호화 고도화(키체인 연동) 제외.
- 사용량/과금 추적 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/settings/byokSettings.ts`
