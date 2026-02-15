# Screen Test Priority Plan (Post-UI)

## Goal
UI 작업 이후, 회귀 위험이 큰 화면부터 낮은 비용으로 테스트를 추가한다.

## Why Screen Tests
- Feature 테스트는 비즈니스 규칙 회귀를 막는다.
- 화면 테스트는 상태 연결, 액션 wiring, 조건부 렌더 회귀를 막는다.
- 이 프로젝트에서는 `review`, `digest`, `collect`의 사용자 플로우 리스크가 높다.

## Priority Rule
- P0: 사용자 핵심 플로우 + 상태 전이 + 저장/응답 액션
- P1: 검색/필터/탭 이동처럼 자주 쓰는 보조 플로우
- P2: 시각 요소, 저빈도 예외, 문구/레이아웃 확인

## Recommended Stack
- Screen Integration: `Jest + @testing-library/react-native`
- Feature Logic: existing `bun test` 유지
- E2E smoke (optional): `Maestro` 또는 `Detox` 중 1개

## P0 Backlog
### 1) `app/(tabs)/review.tsx`
- due item 로드 성공 시 카드 리스트 렌더
- due item 0개일 때 빈 상태 메시지 렌더
- `완료` 탭 시 해당 카드 제거
- `나중에` 탭 시 해당 카드 제거
- 로드 실패 시 로딩 종료 및 빈 리스트 처리(크래시 없음)

### 2) `app/(tabs)/digest.tsx`
- pending 추천 로드 성공 시 카드 렌더
- pending 0개일 때 빈 상태 메시지 렌더
- accept/ignore/dismiss 액션 시 카드 상태 반영
- refresh 시 `generateRecommendations -> saveRecommendations -> reload` 호출

### 3) `app/(tabs)/collect.tsx`
- 채널별 필수 입력 검증(note/link/highlight/screenshot/share)
- 유효 입력 저장 시 `saveKnowledgeItem` 호출 payload 검증
- 저장 성공 시 form reset + invalidateQueries 호출
- 저장 실패 시 Alert 노출 + 폼 유지
- channel 전환 시 입력 초기화

## P1 Backlog
### 4) `app/(tabs)/library.tsx`
- 목록 로드 후 카드 렌더
- 검색어 입력 시 `parseQueryToKeyword + filterKnowledgeItems` 결과 반영
- 빈 결과 시 `EmptyLibraryState` 노출

### 5) `app/(tabs)/_layout.tsx`
- 탭 구성 `collect/library/review/digest` 존재 확인
- `index` 탭 `href: null` 확인

### 6) `app/(tabs)/index.tsx`
- `collect`로 redirect 확인

## P2 Backlog
### 7) `app/settings.tsx`
- 토글/입력 필드 렌더 smoke
- 저장 액션 wiring smoke

### 8) Card-level UI Components
- `ReviewItemCard`, `RecommendationCard`, `KnowledgeItemCard` 최소 상호작용 smoke

## Implementation Order
1. P0 `review`
2. P0 `digest`
3. P0 `collect`
4. P1 `library`
5. P1 탭/redirect
6. P2 settings/components

## Test Design Rules
- 스타일/클래스 검증 금지, 사용자 행동과 상태 변화만 검증
- 네트워크/DB는 직접 접근하지 않고 `src/features/*` mock
- 화면당 3~5개 핵심 시나리오 우선
- flaky 원인(타이머/전역 상태)은 각 테스트에서 명시적으로 초기화

## Exit Criteria
- P0 완료 시: 주요 사용자 플로우 회귀 차단 가능
- P1 완료 시: 탭 전환/검색 UX 회귀 차단 가능
- P2 완료 시: 릴리즈 전 smoke confidence 강화

## Suggested Work Split
- UI 작업 중: 테스트 ID(`testID`)만 필요한 최소 위치에 추가
- UI 작업 완료 직후: P0 먼저 구현
- 안정화 이후: P1/P2 순차 추가
