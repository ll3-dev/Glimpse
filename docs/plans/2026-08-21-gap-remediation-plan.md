# Glimpse 전방위 개선 계획

- 날짜: 2026-08-21
- 기준: `main@2e6a81258c2b`와 현재 로컬 모델 작업 트리
- 상태: 저장소 구현 및 자동 Release 빌드 완료, 외부 런타임 증거 대기
- 원칙: 기존 로컬 변경을 보존하고, 각 작업을 계획 -> 구현 -> 전용 테스트 -> 전체 게이트 순서로 닫는다.

## 목표

감사에서 확인된 제품, 릴리스, 보안, 데이터, 품질, 구조, UX, 운영 공백을 실제 코드와 자동 검증으로 해소한다. 코드로 닫을 수 없는 스토어 자격증명, 실제 배포 승인, 물리 기기 장시간 성능은 별도 외부 증거로 남긴다.

## 완료 상태 정의

- `code-complete`: 저장소 안에서 구현과 자동 테스트가 끝난 상태
- `build-complete`: 해당 플랫폼 Release 빌드가 성공한 상태
- `runtime-proven`: 설치, 실행, 핵심 동작을 실기기나 배포 환경에서 확인한 상태
- `external-blocked`: 서명 인증서, 스토어 계정, 공개 URL처럼 저장소 밖 정보가 필요한 상태

## Workstream 1. 크로스플랫폼 릴리스 게이트

### 1-1. Web SSR 안전한 설정 저장소

계획:

1. MMKV 인스턴스 생성을 플랫폼 어댑터 뒤로 이동한다.
2. 서버에서는 메모리 저장소를 사용하고 브라우저 hydration 이후 영속 저장소를 사용한다.
3. store 모듈 import 시 네이티브 저장소를 읽지 않도록 초기화 경계를 둔다.
4. Web static export 회귀 테스트와 실제 export를 게이트에 추가한다.

완료 기준:

- `npx expo export --platform web` 성공
- SSR 환경에서 settings store import 테스트 성공

### 1-2. iOS Release Codegen 복구

계획:

1. Pod install과 React Codegen 입력/출력 경로를 재생성한다.
2. `app.json`, entitlements, Xcode project의 drift를 제거한다.
3. Hermes 우회 설정을 한 곳에 문서화하고 Release 최적화 영향을 명시한다.
4. 서명 없는 Release simulator 빌드를 자동 검증한다.

완료 기준:

- `xcodebuild ... -configuration Release CODE_SIGNING_ALLOWED=NO` 성공
- Expo config와 실제 entitlement 비교 테스트 성공

### 1-3. Android 배포 설정

계획:

1. production keystore는 환경 변수/Gradle property가 있을 때만 Release에 사용한다.
2. 자격증명이 없으면 배포용 task는 fail-closed로 실패하고, 로컬 smoke task는 명시적으로 분리한다.
3. AAB, ABI split, R8/resource shrink 설정을 정리한다.

완료 기준:

- 로컬 Release smoke 빌드 성공
- production signing 누락을 자동 검출
- 실제 스토어 제출은 `external-blocked`

## Workstream 2. 핵심 제품 루프

### 2-1. 자동 연결 추천

계획:

1. 추천 생성 orchestrator를 추가한다.
2. 앱 시작/foreground/Digest refresh에서 cadence를 확인한다.
3. 생성 결과를 중복 없이 저장하고 query cache를 갱신한다.
4. 추천 응답 후 cadence를 재계산한다.

완료 기준:

- 지식 항목이 충분하면 Digest에 추천이 생성되는 통합 테스트 성공
- 중복 실행, 실패, cooldown 테스트 성공

### 2-2. 지식 기반 채팅

계획:

1. 검색 인터페이스를 키워드 기반 로컬 검색부터 도입한다.
2. 선택된 단일 항목과 검색된 관련 항목을 공통 context budget으로 구성한다.
3. BYOK에도 이전 대화 메시지를 전달한다.
4. 임베딩/RAG backend는 인터페이스로 분리해 이후 온디바이스 인덱스로 교체 가능하게 한다.

완료 기준:

- 관련 지식 여러 개가 로컬/BYOK 프롬프트에 포함되는 테스트 성공
- BYOK multi-turn 회귀 테스트 성공

### 2-3. Apple Intelligence

계획:

1. 지원 OS/기기에서만 활성화되는 네이티브 모듈을 구현한다.
2. 가용성, 취소, 오류 코드를 기존 target 계약에 맞춘다.
3. 지원하지 않는 환경은 명시적 unavailable 상태를 유지한다.

완료 기준:

- 네이티브 컴파일 성공
- 실제 지원 기기 동작 확인은 `runtime-proven` 별도

## Workstream 3. 보안과 데이터 안전

### 3-1. 모델 공급망 무결성

계획:

1. 모델 메타데이터에 revision과 SHA-256을 필수화한다.
2. 일반 다운로드, 복구, 기존 final 파일 모두 크기와 해시를 검증한다.
3. 불일치 파일은 final로 승격하지 않고 진단 가능한 오류를 제공한다.

완료 기준:

- 정상, 손상, 기존 파일, 재시작 복구 테스트 성공
- mutable `resolve/main` URL 제거

### 3-2. API 키 저장 원자성

계획:

1. secure write/delete 실패를 호출자에게 전파한다.
2. 영속 저장 성공 후에만 메모리/UI 상태를 갱신한다.
3. legacy plaintext는 secure write 검증 후 삭제한다.
4. Web에서는 API 키 영속 저장을 기본 금지한다.

완료 기준:

- Keychain/Keystore 실패 시 키 보존 및 UI rollback 테스트 성공

### 3-3. SQLite migration과 데이터 이동

계획:

1. 버전별 ordered migration runner와 transaction을 추가한다.
2. 마이그레이션 전 백업과 `integrity_check`를 수행한다.
3. App Group 이동 시 DB/WAL/SHM을 일관되게 처리한다.
4. export/import/delete API와 사용자 흐름을 추가한다.

완료 기준:

- 이전 schema upgrade, rollback, 손상 DB 테스트 성공
- export -> delete -> import round-trip 성공

### 3-4. 개인정보·백업 정책

계획:

1. Android 자동 cloud backup을 opt-out하거나 명시적 rules로 제한한다.
2. 로컬 저장, BYOK 전송, 모델 다운로드 범위를 개인정보 문서에 명시한다.
3. iOS DB/model backup exclusion을 적용한다.

## Workstream 4. 품질과 CI

계획:

1. Bun/Rust/Java toolchain을 고정한다.
2. Web export, bridge generated diff, coverage, dependency audit를 CI에 추가한다.
3. macOS iOS Release와 Android Release smoke job을 추가한다.
4. 모바일 핵심 흐름 E2E와 접근성 smoke를 추가한다.
5. 취약점은 runtime/dev/transitive로 분류하고 승인된 예외만 allowlist한다.

완료 기준:

- 모든 자동 게이트 green
- 현재 high/critical runtime 취약점 0 또는 근거 있는 만료형 예외

## Workstream 5. 운영과 배포

계획:

1. 앱 내부 진단 이벤트와 선택 가능한 crash reporter adapter를 추가한다.
2. 오류 화면의 잘못된 이슈 링크를 수정한다.
3. LICENSE, SECURITY, PRIVACY, CONTRIBUTING, CHANGELOG, support 문서를 추가한다.
4. EAS/Tauri 배포 설정에서 placeholder를 환경 변수 기반 fail-closed 검증으로 교체한다.
5. Tauri CSP, external URL allowlist, updater/signing 설정을 정리한다.

## Workstream 6. 구조와 성능

계획:

1. 모바일/데스크톱 capture/chat/recommendation/review application 로직을 `packages/features`로 수렴한다.
2. 현재 작업 중인 대형 모델 파일을 registry data, compatibility policy, runtime preset, executor로 분리한다.
3. 로컬 모델을 background/memory pressure에서 안전하게 unload한다.
4. 데스크톱 route/component lazy loading으로 메인 chunk를 줄인다.
5. 모델 catalog의 context length와 실제 runtime context를 구분해 표시한다.

## Workstream 7. UX, 접근성, 디자인 시스템

계획:

1. 공용 interactive primitive에 role, label, state, 최소 touch target을 제공한다.
2. 주요 화면부터 스크린리더, font scaling, reduced motion, focus order를 검증한다.
3. 하드코딩 색상을 semantic token으로 교체한다.
4. 한국어/영어 문자열 카탈로그와 locale 선택 경계를 추가한다.
5. OCR, 모델 다운로드, AI 전송, 데이터 삭제 실패에 사용자 피드백을 제공한다.

완료 기준:

- React Doctor의 실제 오류 0
- 주요 화면 접근성 smoke 성공
- 변경 UI가 `DESIGN.md` 토큰 규칙 준수

## 단계별 전체 검증

각 workstream 종료 시 관련 테스트 외에 아래를 재실행한다.

```sh
bun run lint
bun run typecheck
bun run desktop:typecheck
bun test
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
```

최종 단계에서는 Web export, desktop production build, iOS Release simulator, Android Release/AAB, React Doctor, dependency audit를 추가한다.

## 외부 증거가 필요한 잔여 조건

- Apple/Google production signing credentials
- App Store Connect/Google Play 제출
- Apple Intelligence 지원 실기기
- Android/iOS 장시간 로컬 모델 thermal/memory smoke
- 공개 privacy/support URL

이 항목들은 저장소 구현을 완료한 뒤 `external-blocked`로 명시하고 필요한 사용자 입력만 요청한다.

## 실행 결과 (2026-08-21)

### Code complete

- Web SSR 저장소 어댑터, 정적 export, 추천 cadence/orchestrator, 다중 지식 검색 context와 BYOK multi-turn을 구현했다.
- Apple Foundation Models 네이티브 브리지와 지원 OS/기기 가용성 경계를 추가했다.
- 모델 revision/SHA-256 검증, secure storage 원자성, SQLite v2 ordered migration, DB/WAL/SHM 이동, export/import/delete를 구현했다.
- Android backup opt-out, iOS DB/model backup exclusion, 개인정보·보안·지원·기여·변경 이력 문서를 추가했다.
- CI에 Web/iOS/Android Release, coverage, bridge drift, Clippy, critical audit 게이트를 추가하고 Dependabot을 설정했다.
- Tauri CSP, updater/signing fail-closed 설정, 선택형 진단 reporter, 올바른 support 링크를 추가했다.
- 공유 application 로직과 local LLM runtime을 분리하고, 데스크톱 route chunk와 모바일 설정 컴포넌트를 책임 단위로 나눴다.
- semantic theme token, 접근성 role/state/44pt target, reduced motion, 한국어/영어 locale 경계와 설정 화면 카탈로그를 적용했다.

### Build complete

- Web static export: 17개 route 성공
- iOS: unsigned Release simulator 전체 빌드 성공
- Android: arm64 unsigned Release AAB 성공, `app-release.aab` 73MB
- Desktop: Release native binary와 `Glimpse.app` 성공
- Desktop DMG: Finder 배치 없이 생성·마운트·압축 성공, `Glimpse_0.1.0_aarch64.dmg` 3.6MB

### Automated gates

- Bun: 562 tests, 0 failures, function 70.41%, line 75.05%
- Rust: workspace tests 전체 성공, Clippy `-D warnings` 성공
- TypeScript: mobile/desktop typecheck 성공
- Expo lint 및 `git diff --check` 성공
- React Doctor changed scope: 100/100, 실제 오류 0
- Critical dependency audit: 0개. 남은 전이 취약점 예외는 `2026-09-21`에 재검토한다.

### Runtime proven / external blocked

- Apple Intelligence는 iOS 26 지원 물리 기기에서 실제 생성·취소·오류 복구를 확인해야 한다.
- Android/iOS 로컬 모델의 장시간 thermal/memory와 백그라운드 복귀는 물리 기기 확인이 필요하다.
- App Store/Google Play 서명·제출, Tauri updater 공개 HTTPS endpoint/서명 키, 공개 privacy/support URL은 외부 자격증명과 URL이 필요하다.
- 기본 Tauri DMG의 Finder 아이콘 자동 배치는 현재 Mac의 Finder Automation 권한이 없어 미검증이며, 내용물이 같은 `--skip-jenkins` DMG는 성공했다.
