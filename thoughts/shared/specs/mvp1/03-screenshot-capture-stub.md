---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: medium
---

# MVP v1-03 스크린샷 입력 스텁 SPEC

## 문제
시각 정보를 저장할 최소 입력 경로가 없으면 스크린샷 채널 검증이 지연됩니다.

## 해결 목표
**현재:** 이미지 URI를 받아 저장하는 흐름이 없습니다.
**목표:** 이미지 URI + 메모를 저장할 수 있는 스텁 흐름을 추가해 채널을 먼저 연다.

## 성공 기준
- [ ] 이미지 URI 문자열 또는 로컬 경로를 입력/전달받아 저장할 수 있다.
- [ ] 저장 시 `type=screenshot`으로 기록된다.
- [ ] OCR 결과 필드가 없어도 저장 실패 없이 동작한다.

## 범위 제한
- 이미지 피커/카메라 권한 연동 제외.
- OCR 추출 파이프라인 제외.
- 썸네일 생성/압축 최적화 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/thoughts/shared/inputs/glimpse-vision-mvp-roadmap.md`
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/capture/screenshotCaptureStub.ts`
