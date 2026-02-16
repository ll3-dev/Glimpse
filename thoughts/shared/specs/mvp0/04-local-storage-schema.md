---
date: 2026-02-14
author: loopy
status: draft
type: feature
priority: high
---

# MVP v0-04 로컬 저장 스키마 SPEC

## 문제
입력 데이터를 저장할 로컬 구조가 없으면 수집/검색 기능을 검증할 수 없습니다.

## 해결 목표
**현재:** 메모/링크를 일관되게 저장할 데이터 모델이 없습니다.
**목표:** `knowledge_item` 중심의 최소 로컬 스키마를 정의해 저장/조회 기반을 마련합니다.

**현재:** 메모/링크 타입별 저장 규격이 정해져 있지 않음
**목표:** `id`, `type`, `title`, `body`, `url`, `summary`, `tags`, `createdAt`, `updatedAt`를 담는 공통 모델 확보

## 성공 기준
- [x] 로컬 DB 테이블(또는 동등한 저장 구조) 스키마가 코드로 정의된다.
- [x] 메모/링크 모두 단일 모델로 저장 가능하다.
- [x] 리스트/검색에서 필요한 인덱싱 키(`type`, `createdAt`)가 준비된다.

## 범위 제한
- 멀티 디바이스 동기화 제외.
- 암호화 저장/보안 키체인 연동 제외.
- 마이그레이션 다중 버전 전략 제외.

## 참고 자료
- `/Users/loopy/dev/ll3/Glimpse/package.json` (`drizzle-orm`, `react-native-nitro-sqlite`)
- 예상 경로: `/Users/loopy/dev/ll3/Glimpse/src/db/schema.ts`
