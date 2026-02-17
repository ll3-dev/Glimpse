---
date: 2026-02-17
author: loopy
status: draft
type: feature
priority: high
---

# AI SDK 06 Apple 네이티브 엔트리 스켈레톤 SPEC

## 문제
Apple provider를 실연동하려면 JS 이전에 iOS 네이티브 모듈 엔트리가 존재해야 합니다.

## 해결 목표
**현재:** Apple Intelligence는 토글/가용성 판단 위주이며 네이티브 생성 엔트리가 없습니다.  
**목표:** 기존 폴더 구조(`ios/glimpse/*`) 안에서 최소 네이티브 모듈 스켈레톤을 추가합니다.

## 성공 기준
- [ ] `ios/glimpse/*` 경로에 모듈 스켈레톤 파일이 추가된다.
- [ ] 모듈 이름이 JS bridge에서 resolve 가능한 값으로 고정된다.
- [ ] 새 최상위 폴더(`modules/*`)를 만들지 않는다.

## 범위 제한
- 실제 `generate` 구현은 제외합니다.
- plugin 세부 설정은 제외합니다.
- provider 통합은 제외합니다.

## 참고 자료
- `ios/glimpse/AppDelegate.swift`
- `app.json`

