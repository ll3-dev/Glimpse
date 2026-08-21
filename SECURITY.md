# 보안 정책

## 지원 범위

보안 수정은 기본 브랜치의 최신 코드와 현재 배포 중인 최신 버전을 대상으로 합니다. 오래된 개발 빌드와 임의 수정 빌드는 지원 대상이 아닙니다.

## 취약점 제보

공개 Issue에 API 키, 개인 데이터, 재현용 DB를 첨부하지 마세요. 저장소의 [비공개 Security Advisory](https://github.com/ll3-dev/Glimpse/security/advisories/new)로 다음 내용을 보내주세요.

- 영향을 받는 플랫폼과 버전
- 재현 절차와 예상 영향
- 필요한 최소 로그. 비밀 값은 반드시 제거
- 가능한 경우 완화책 또는 수정 제안

접수 사실은 7일 안에 확인하고, 영향도와 공개 일정을 제보자와 조율합니다.

## 기본 보안 원칙

- BYOK 키는 iOS Keychain 또는 Android Keystore에 저장합니다. Web에서는 세션 메모리에만 둡니다.
- 모델 다운로드는 고정된 Hugging Face commit과 LFS SHA-256으로 검증합니다.
- Android cloud backup과 iOS 로컬 DB·모델 backup을 비활성화합니다.
- CI는 critical JavaScript advisory, Rust 테스트·Clippy, Web/iOS/Android Release 빌드를 차단 게이트로 사용합니다.

잔여 전이 의존성 검토 내역은 [의존성 감사 기록](docs/security/dependency-audit.md)에 관리합니다.
