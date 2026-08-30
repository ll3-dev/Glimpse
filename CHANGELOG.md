# 변경 이력

이 프로젝트는 중요한 사용자 영향 변경을 이 문서에 기록합니다.

## Unreleased

### Added

- 자동 추천 cadence와 foreground refresh
- 다중 지식 컨텍스트 기반 채팅과 BYOK multi-turn
- iOS 26 Foundation Models 기반 Apple Intelligence 모듈
- Web static export와 플랫폼별 저장소 어댑터
- 모바일 Release CI 및 모델 다운로드 SHA-256 검증
- 복습 리마인더 — expo-notifications(모바일)·Tauri notification(데스크톱) 크로스플랫폼 알림, 설정 섹션과 권한 처리
- 라벨링 백필 — 미라벨 항목을 시작 시 pending 큐에 편입(모바일·데스크톱)
- AI 미설정 경험 — 스텁 요약 저장 시 세션당 1회 AI 연결 안내, 스텁 요약 품질 교체 안내
- 채팅 RAG — 지식 컨텍스트 검색 주입, 참조한 노트 칩(유사도 툴팁), 설정 토글(기본 on)
- digest 최근 연결 섹션 — 수락된 엣지 최신 3개 표시
- iOS Shortcuts 빠른 노트 캡처 App Intent
- 보관함 상세 연결된 노트 섹션과 연결도 기반 복습 due 정렬
- 그래프 증분 분석 파이프라인 — 전체 지식베이스 대상, 24개 윈도우 상한 제거, 자동화 훅 연동
- sync_discover 브리지 커맨드 — desktop mdns-sd, iOS dnssd(Bonjour), Android JNI 백엔드
- sync_plan 브리지 커맨드 — 엔드포인트/백오프 판단을 Rust로 이동
- 워터마크 델타 동기화(양방향) — 증분 export·row-merge, 사전 백업, 헤드리스 E2E(`cd apps/mobile && bun run sync:e2e`)
- 데스크톱 커스텀 타이틀바·다크 모드 토글·글로벌 단축키, 앱 아이콘·로고
- 모바일 다크 모드 완전 구현 — uniwind `@variant` 테마 토큰, 시스템/라이트/다크 설정, MMKV 영속
- 공유 EmptyState 프리미티브 — 6개 화면 교체, 아이콘(20)·간격(py-24/compact py-8) 정규화

### Changed

- SQLite schema v2에서 추천 쌍을 canonical unique pair로 관리
- API 키 저장을 성공 확인 후 반영하는 원자적 흐름으로 변경
- Android production signing을 fail-closed 구성으로 변경
- 동기화: exportDelta·syncDataRevision 커맨드로 상행 델타 전환, sync_plan 6커맨드 브리지 이관, 재페어링 auth freeze 해제
- iOS discovery를 Rust dnssd syncDiscover 경로로 전환 — Swift 네이티브 모듈 제거
- 공유 인텐트(ShareExtension/Shortcuts)가 캡처 폼에 프리필되도록 배선 — pending 교체 없이 append
- recommendations 쿼리 무효화를 all 프리픽스로 통일, 지식 저장 후 전체 무효화, 복습 뮤테이션 detail 무효화 수리
- UI 패턴 통합 — 화면 로직 컴포넌트 추출, 정렬 칩 통합, 시맨틱 색상 전환, `text-app-bg` 역전 토큰 적용
- FALLBACKS를 globals.css 실값으로 통일, 데드 코드 제거(구 캡처 폼 6종·데드 쿼리 키·고아 emit)
- Expo SDK 55→57 업그레이드, TypeScript 5.9→6.0, @rustra/types 0.6.0 lockstep

### Security

- 모델 URL을 immutable Hugging Face revision으로 고정
- Android backup 비활성화와 iOS 로컬 데이터 backup 제외
- critical JavaScript dependency audit CI 게이트 추가
