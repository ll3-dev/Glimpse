# 변경 이력

이 프로젝트는 중요한 사용자 영향 변경을 이 문서에 기록합니다.

## Unreleased

### Added

- 자동 추천 cadence와 foreground refresh
- 다중 지식 컨텍스트 기반 채팅과 BYOK multi-turn
- iOS 26 Foundation Models 기반 Apple Intelligence 모듈
- Web static export와 플랫폼별 저장소 어댑터
- 모바일 Release CI 및 모델 다운로드 SHA-256 검증

### Changed

- SQLite schema v2에서 추천 쌍을 canonical unique pair로 관리
- API 키 저장을 성공 확인 후 반영하는 원자적 흐름으로 변경
- Android production signing을 fail-closed 구성으로 변경

### Security

- 모델 URL을 immutable Hugging Face revision으로 고정
- Android backup 비활성화와 iOS 로컬 데이터 backup 제외
- critical JavaScript dependency audit CI 게이트 추가
