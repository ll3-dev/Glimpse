---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v0-02 메모 입력 폼 SPEC

## 문제
핵심 입력 채널 중 하나인 메모 입력이 없으면 지식 수집의 기본 가치가 성립되지 않습니다.

## 해결 목표
**현재:** 사용자가 텍스트 메모를 작성해 저장 요청할 수 있는 최소 UI가 없습니다.
**목표:** 제목/본문을 입력하고 저장 액션을 발생시키는 메모 입력 폼을 제공합니다.

## 성공 기준
- [x] 제목, 본문 입력 필드가 있다.
- [x] 저장 버튼 탭 시 필수값 검증(본문 기준)을 수행한다.
- [x] 검증 통과 시 저장 유스케이스 호출 이벤트가 발생한다.

## 범위 제한
- 리치 텍스트, 첨부파일, 체크리스트는 제외.
- 자동 태깅/요약 계산은 이 SPEC 범위에서 제외.
- 오프라인 동기화 충돌 처리 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/package.json` (`react`, `react-native`)
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/app/(tabs)/collect.tsx`
