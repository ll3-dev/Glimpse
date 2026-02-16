---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v1-04 공유 시트 유입 스텁 SPEC

## 문제
앱 외부에서 들어오는 공유 유입이 없으면 실제 사용 맥락에서 수집 장벽이 높습니다.

## 해결 목표
**현재:** OS 공유 시트로 들어온 텍스트/URL을 처리하는 진입점이 없습니다.
**목표:** 공유 데이터(텍스트/URL)를 받아 기본 저장 폼으로 연결하는 스텁을 만듭니다.

## 성공 기준
- [ ] 공유 데이터 수신 시 앱에서 처리 가능한 상태 객체로 변환된다.
- [ ] URL이 있으면 링크 채널, 텍스트만 있으면 메모/하이라이트 채널 기본값이 설정된다.
- [ ] 사용자가 최종 저장 전에 내용을 확인/수정할 수 있다.

## 범위 제한
- 파일 첨부(이미지, PDF, 동영상) 처리 제외.
- 백그라운드 무인 저장 제외.
- Android/iOS 플랫폼별 고급 예외 처리 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/package.json` (`expo-share-intent`)
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/features/share/ingestShareIntent.ts`
