---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: medium
---

# AI SDK 10 Settings Store 연결 SPEC

## 문제
Provider readiness가 settings 상태와 분리되면 토글/모델 선택이 실제 생성 경로에 반영되지 않습니다.

## 해결 목표
**현재:** store 상태와 provider 상태가 느슨하게 연결되어 있습니다.  
**목표:** Apple/Local 관련 store 상태를 provider availability 판정에 직접 연결합니다.

## 성공 기준
- [ ] `local-llm.store.ts`의 모델 선택/준비 상태가 Local provider readiness에 반영된다.
- [ ] `appleIntelligence.store.ts`의 enable/availability 상태가 Apple provider readiness에 반영된다.
- [ ] 토글 변경 후 라우터 선택 provider가 기대대로 바뀐다.

## 범위 제한
- 설정 화면 레이아웃 리디자인은 제외합니다.
- 신규 상태관리 라이브러리 도입은 제외합니다.
- 영속성 마이그레이션은 제외합니다.

## 참고 자료
- `src/stores/settings/local-llm.store.ts`
- `src/stores/settings/appleIntelligence.store.ts`
- `src/components/settings/AppleIntelligenceSection.tsx`

