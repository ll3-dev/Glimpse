---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: low
---

# MVP v2-08 Apple Intelligence 토글 스텁 SPEC

## 문제
Apple Intelligence 활용 방향은 비전에 명시되어 있으나, 기능 플래그가 없으면 실험/점진 배포가 어렵습니다.

## 해결 목표
**현재:** 온디바이스 AI 경로를 켜고 끌 수 있는 설정이 없습니다.
**목표:** 플랫폼/지원 여부를 확인해 Apple Intelligence 경로를 활성화하는 토글 스텁을 추가합니다.

## 성공 기준
- [ ] 설정 화면에서 토글 상태를 저장/복원한다.
- [ ] 미지원 플랫폼에서 비활성 상태 안내를 표시한다.
- [ ] 추론 경로 선택 로직에서 해당 토글 값을 읽을 수 있다.

## 범위 제한
- 실제 Apple Intelligence API 연동 제외.
- 성능 벤치마크 제외.
- 모델 품질 비교 실험 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/settings/appleIntelligenceToggle.ts`
