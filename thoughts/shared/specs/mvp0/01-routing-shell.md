---
date: 2026-02-14
author: loopy
status: done
type: feature
priority: high
---

# MVP v0-01 라우팅 셸 SPEC

## 문제
MVP 기능을 추가할 화면 구조가 없으면 이후 작업(입력/목록/검색)을 병렬로 진행하기 어렵습니다.

## 해결 목표
**현재:** 기능별 진입점과 화면 이동 경로가 정해져 있지 않습니다.
**목표:** `수집(Collect)` 화면과 `저장 목록(Library)` 화면으로 이동 가능한 최소 라우팅 셸을 확보합니다.

## 성공 기준
- [x] Expo Router 기준으로 `Collect`와 `Library` 화면이 각각 진입 가능하다.
- [x] 앱 실행 시 두 화면 중 하나로 진입해 화면 전환이 가능하다.
- [x] 이후 SPEC에서 재사용 가능한 화면 파일 경로가 고정된다.

## 범위 제한
- 시각 디자인 디테일(컬러/타이포/애니메이션)은 제외.
- 상태관리/데이터 로딩 로직은 제외.
- 인증/온보딩/설정 화면은 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/package.json` (`expo-router`)
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/app/(tabs)/collect.tsx`, `/Users/loopy/dev/ll3/Glimpse/app/(tabs)/library.tsx`
