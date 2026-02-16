---
date: 2026-02-16
author: loopy
status: draft
type: feature
priority: high
---

# AI Meta 05 Local LLM 다중 모델 설정 상태 SPEC

## 문제
Local LLM을 provider로 사용하려면 활성화 여부와 선택 모델 목록/현재 모델이 상태로 관리되어야 하는데, 현재 설정 스토어에는 해당 정보가 없습니다.

## 해결 목표
**현재:** 설정 상태는 Apple 토글과 BYOK 정보만 포함합니다.  
**목표:** Local LLM 다중 모델 선택 상태를 추가해 라우터와 설정 UI가 동일한 상태를 읽도록 합니다.

## 성공 기준
- [ ] Local LLM 설정 상태(활성화, 선택 모델, 모델 목록)가 store 계약에 추가된다.
- [ ] 읽기/쓰기 selector/command 함수가 정의된다.
- [ ] 기본값과 미설정 상태 동작(비활성/선택 없음)이 명확히 정의된다.

## 범위 제한
- 모델 다운로드/파일 관리 기능은 제외합니다.
- 네이티브 권한 요청 플로우는 제외합니다.
- UI 디자인 리뉴얼은 제외합니다.

## 참고 자료
- `src/stores/settings/byok.store.ts`
- `src/features/settings/byok.commands.ts`
- `src/components/settings/useSettingsScreenState.ts`

