# AGENTS.md

## 목적
Glimpse 저장소에서 작업하는 AI/자동화 에이전트를 위한 실행 가이드다. 이 문서는 빠른 구현, 안전한 수정 범위, 일관된 코드 스타일을 우선한다.

## 프로젝트 개요
- 앱 유형: Expo 기반 React Native 모바일 앱 (iOS/Android)
- 라우팅: Expo Router (`app/` 파일 기반 라우팅)
- 상태/데이터: Zustand + TanStack Query + 로컬 SQLite(Drizzle)
- 스타일: Uniwind(Tailwind 유사 유틸리티 클래스)
- 네이티브 연동: Nitro Modules (`modules/`, `nitrogen/generated/`, `android/`, `ios/`)

## 패키지 매니저
- 기본 패키지 매니저는 Bun으로 간주한다.
- 근거: 저장소 루트에 `bun.lock`이 존재한다.
- 의존성 설치/스크립트 실행은 Bun 명령을 우선 사용한다.

## 자주 쓰는 명령
```bash
bun install
bun run start
bun run ios
bun run android
bun run web
bun run lint
bunx drizzle-kit generate
bunx expo drizzle
```

## 작업 원칙
- 작은 단위로 변경하고, 영향 범위를 명확히 유지한다.
- 기존 컴포넌트/훅 패턴을 우선 재사용하고 새 추상화는 필요할 때만 추가한다.
- 데이터 스키마 변경 시 마이그레이션까지 함께 반영한다.
- UI 수정 시 iOS/Android 동작 차이를 함께 점검한다.

## 디렉터리 책임
- `app/`: 화면/라우트
- `components/`: 재사용 UI 및 기능 컴포넌트
- `components/ui/`: 공통 UI 프리미티브
- `hooks/`, `hooks/db/`: 화면 로직 및 DB query/mutation 훅
- `db/`, `drizzle/`: 스키마, DB 접근, 마이그레이션
- `store/`: 전역 상태(Zustand)
- `lib/`: 유틸리티/초기화/상수
- `modules/`, `src/specs/`, `nitrogen/`: 네이티브 브리지 및 생성 코드
- `android/`, `ios/`: 플랫폼 네이티브 프로젝트

## 코드 컨벤션
- 이벤트 핸들러는 `handleX`보다 `onX` 네이밍을 우선한다.
- 훅은 `useX`, 컴포넌트는 PascalCase를 사용한다.
- 경로 별칭 `@/*` 사용 가능 (`tsconfig.json`).
- Uniwind 클래스는 정적으로 작성한다.
  - 금지: 템플릿 문자열 조합 (예: `` `text-${color}` ``)
  - 권장: 분기 시 클래스 문자열을 명시적으로 나열

## DB/상태 규칙
- DB 접근은 가급적 `hooks/db/*`를 통해 일관되게 사용한다.
- 변경 작업(추가/수정/삭제)은 mutation 훅에서 처리하고 query invalidate를 누락하지 않는다.
- 스키마 변경 시:
  1. `db/schema.ts` 수정
  2. 마이그레이션 생성 (`bunx drizzle-kit generate`)
  3. 앱 구동 시 마이그레이션 정상 적용 확인

## 네이티브/생성 코드 주의
- `nitrogen/generated/` 내부 파일은 수동 수정하지 않는다. 필요 시 생성 파이프라인으로 갱신한다.
- 네이티브 브리지 변경은 TS spec, Android/iOS 구현, 사용처를 함께 맞춘다.
- 공유 인텐트/익스텐션 관련 코드는 플랫폼별 설정 파일을 함께 검토한다.

## 수정 전 체크리스트
- 변경 파일이 적절한 레이어(화면/훅/DB/네이티브)에 위치하는가?
- 재사용 가능한 기존 컴포넌트/유틸을 먼저 활용했는가?
- 타입 오류/린트 오류가 없는가?
- 데이터 흐름(query/mutation/invalidate)에 누락이 없는가?

## 완료 전 체크리스트
```bash
bun run lint
```
필요 시 플랫폼 실행으로 회귀 확인:
```bash
bun run ios
bun run android
```

## 금지/주의 사항
- 생성 코드(`nitrogen/generated/`) 직접 수정 금지
- 관련 없는 리팩터링 확장 금지
- 근거 없는 새 의존성 추가 금지
- 대규모 구조 변경은 사전 합의 없이 진행 금지
