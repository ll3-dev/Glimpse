---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v1-01 수집 채널 전환 UI SPEC

## 문제
새 입력 채널이 늘어도 선택 UI가 없으면 사용자 유입 경로를 열 수 없습니다.

## 해결 목표
**현재:** Collect 화면이 v0 채널(메모/링크) 중심으로 고정되어 있습니다.
**목표:** 메모/링크/하이라이트/스크린샷/공유 채널을 전환할 수 있는 최소 탭 또는 세그먼트 UI를 제공합니다.

## 성공 기준
- [ ] 5개 채널이 전환 가능하다.
- [ ] 선택 채널 상태가 화면에서 명확히 표시된다.
- [ ] 채널 변경 시 기존 입력값 상태가 의도대로 초기화 또는 유지된다.

## 범위 제한
- 채널별 고급 폼 검증 제외.
- 애니메이션 전환 효과 제외.
- 채널 커스터마이징 기능 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/specs/2026-02-14_mvp0-02-note-capture-form.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/app/(tabs)/collect.tsx`
