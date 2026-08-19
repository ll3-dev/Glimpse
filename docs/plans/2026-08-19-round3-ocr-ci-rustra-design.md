# 라운드 3 디자인 — OCR 완성 + CI + rustra 흡수 + 문서 정합

- 날짜: 2026-08-19
- 상태: 승인됨 (접근법 A+A — CI→rustra→OCR→문서 순서, 자체 네이티브 OCR 모듈)
- 전제: 안정화 라운드 1·2 완료 상태에서 시작 (게이트 전량 통과, b17ad58 이후)

## 배경

안정화 프로그램(라운드 1·2)이 끝나고 Glimpse는 양 플랫폼에서 코어 통합·안정화가 완료됐다. 잔여 감사(`thoughts/shared/research/2026-08-19_00-37-04_remaining-work-stabilization-audit.md`) 기준으로 남은 것은 4계층이며, 그중 사용자가 선택한 방향:

1. **기능 완성** — OCR이 유일한 "스텁 그대로" 기능 (1초 딜레이 후 빈 텍스트 반환)
2. **기술 부채 정리** — CI 없음(게이트 전부 로컬 수동), rustra 0.1.2 이후 상류 61커밋 미흡수, 문서 드리프트

이 네 가지를 "라운드 3"으로 묶어 순서대로 진행한다.

## 목표

1. 스크린샷 캡처 → OCR 텍스트 자동 추출 → 저장까지 실제로 동작하는 흐름 완성
2. push/PR마다 lint·typecheck·test·cargo 게이트가 자동으로 도는 CI 확보
3. rustra 0.2.0 흡수로 JSI fast path·취소·payload 한도 등 상류 개선 수혜
4. 문서가 코드를 따라가게 정합 (드리프트·이중 기록 정리)

비목표: 데스크톱 OCR(macOS Vision — 별도 이슈), EAS 자격증명(본인 정보 필요), CI에서 네이티브 앱 빌드(비용 대비 효과 낮음, 로컬 GUI 체크리스트 유지), 멀티 디바이스 싱크·추천 UX 개선.

## 단계 1: CI 파이프라인

`.github/workflows/ci.yml` 단일 워크플로, PR + main push 트리거.

| 잡 | 내용 |
|---|---|
| `js` | bun install → 루트 `lint`, `typecheck`(mobile), `desktop:typecheck`, `test`(mobile 508개) |
| `rust` | `cargo test --workspace`(core+bridge+desktop), `cargo clippy -- -D warnings`, `desktop:rust:check` |

- package.json의 기존 게이트 스크립트를 재사용 — workflow는 thin wrapper
- Node/Rust 캐시로 속도 확보. 네이티브 빌드(ios/android/tauri bundle)는 CI에 넣지 않음

## 단계 2: rustra 0.2.0 흡수

**전제 작업 (rustra 레포 사이드)**: 0.2.0 릴리스 컷 — main이 이미 `@rustra/types@0.1.2` 태그보다 61커밋 앞서고 minor changeset(10개 패키지)이 준비돼 있음.

Glimpse 측 변경:
- `@rustra/types`·`@rustra/react-native` overrides 및 의존성 → 0.2.0, Cargo `rustra = "=0.2.0"` 핀
- `build:bridge:ios`·`build:bridge:android` 재빌드 (프리빌트 .a 교체)
- `bridge:generate` 재실행 (스키마 변화 반영 여부 확인)

**선별 수혜 적용**:
- JSI fast path 4종(평평한 JS 객체 설치, 생성자 캐시 등) — 재빌드만으로 수혜, Glimpse 코드 변경 불요
- `invokeTypedAsync` id 노출·invokeBatch 항목별 취소 — 기존 cancel_download 플래그와의 계약 정합 "검토"만 (재연결은 라운드 4 후보)
- AbortSignal 전파, OTA schemaVersion 협상 — 검토 후 필요 시 적용

게이트 전량 재통과.

## 단계 3: 네이티브 OCR (`apps/mobile/modules/ocr`)

`modules/rustra-jsi`의 로컬 모듈 패턴을 따르되 expo-module 정석 구조:

```
apps/mobile/modules/ocr/
  expo-module.config.json
  ios/OcrModule.swift        # VNRecognizeTextRequest (iOS 16+, 한국어+영어, accurate)
  android/.../OcrModule.kt   # ML Kit text-recognition 번들형 (latin+korean)
  src/index.ts               # 타입 + 플랫폼 진입점
  src/ocr.web.ts             # web 폴백: 명시적 미지원 에러 (조용한 빈 텍스트 아님)
```

- **API**: `recognizeText(imageUri): Promise<OcrResult>`, `OcrResult = { text, confidence, language }` — 단일 함수 (YAGNI)
- **연결**: `ScreenshotForm.tsx` 스텁 교체. 추출 텍스트는 기존 저장·라벨링 파이프라인으로
- **에러**: 네이티브 실패 시 재시도 가능한 에러 노출. confidence 임계 미달 시 "텍스트 없음" 명시
- **테스트**: 서비스 레이어 mock 유닛테스트 추가, 네이티브는 GUI 체크리스트에 OCR 항목 추가

## 단계 4: 문서 정합

- `2026-08-16-rustra-integration-design.md`: 죽은 `desktop-core-client.ts` 참조 삭제, 뮤텍스 "3주차 재평가" 표 정정, 헤딩 규격 통일
- GUI 검증 체크리스트 이중 기록 해소 — integration-plan을 진실 소스로 단일화
- 라운드 3 완료 기록 + 메모리 갱신

## 리스크

- rustra 0.2.0 릴리스가 지연되면 단계 2가 막힘 → 그 경우 단계 3(OCR)을 먼저 하고 2를 나중에 하는 순서 교체 허용
- ML Kit 번들형 추가로 Android APK 크기 증가 (~수 MB) — 번들이 아닌 언 unlabeled 선택은 고려하지 않음(오프라인·프라이버시 원칙)
- CI 첫 도입 시 워크플로 자체의 버그로 빨간 불 — 로컬에서 `act` 또는 수동 push 전 검증

## 완료 기준

1. `.github/workflows/ci.yml` 존재, main push에서 두 잡 그린
2. rustra 0.2.0 핀, 게이트 전량 통과, bridge 재빌드
3. 실기기/시뮬레이터에서 스크린샷 캡처 시 텍스트 추출 동작 (GUI 체크리스트 OCR 항목 통과)
4. 문서 드리프트 항목 0건 (감사 문서 6절 기준)
