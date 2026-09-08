# 다방면 필요 리서치 후속 구현 기록 (2026-09-08)

**날짜**: 2026-09-08
**근거**: `thoughts/shared/research/2026-09-08_next-needs-internal.md`,
`thoughts/shared/research/2026-09-08_next-needs-external.md`의 우선순위 스택을
오너 지시("커밋들과 함께 지속 임베딩과 나머지 것들도 모두 진행")로 실행한 기록.

---

## 완료

### 0. 미커밋 175파일 분리 커밋 + CI 원인 제거

- **Tauri 아이콘 3종 커밋**(32x32·128x128·128x128@2x) — CI 적색 run 34058084289의
  직접 원인(fresh 클론 `generate_context!()` 패닉) 제거. 번들 리소스 가드 테스트 동봉.
- 영역별 15커밋: CI복구 가드 → 챗 생성 DI → 데스크톱 BYOK 제거/로컬 서버 → 툴콜 →
  공유 daily/여정 → 데스크톱 digest → 다운로드 배경화 → 모바일 BYOK 제거 → 카탈로그
  28종 → GGUF 탐색기/RAM 전문가 경로 → 카메라/Shortcuts → 모바일 digest → rustra
  0.7/0.8+릴리즈 스크립트 → 플랜 문서 → 리서치 문서.
- JS job의 `mobileCoreClient typed bridge contract` 6 fail은 워킹트리 수리분 커밋으로 해소.
- `libglimpse_bridge.a`: git 트랙드 대상이 아님(`*.a` gitignore) 확인. Android 4 ABI
  재생성 완료(597f822 no_mangle 수리 이후 빌드) — 실기기 게이트의 선행 조건 소화.
  iOS `.a`는 JNI 수리와 무관해 재생성 불요(필요 시 `build:bridge:ios`).

### 1. 지속 임베딩 인덱스(데스크톱) + 모바일 검색 일원화

- `apps/desktop/src/features/ai/embedding-index.ts` — 항목 텍스트 해시(FNV-1a)당
  벡터를 localStorage에 저장(설정·그래프 지표와 같은 경로), 소수 4자리 반올림,
  최대 1,000 엔트리(최오름 방출), 라이브러리 프룬, 모델 불일치 시 전면 폐기.
- `chat-generation.ts` — 캐시 적중분은 재임베딩 없이 랭킹, 변경분+질문만 배치 전송.
  **`RAG_LIBRARY_LIMIT=100` 하드 컷 철폐**(관련 항목이 조용히 잘리던 정확성 결함
  해소) → 최신성 우선 정렬 후 1,000 안전 상한만 유지. 저장 실패는 채팅을 막지 않음.
- 모바일 `chat-context.ts` — 챗 지식 선정을 휴리스릭 후보 풀(3배) 확보 후
  온디바이스 임베더 재순위로 일원화. 임베더 부재/실패 시 기존 휴리스틱 폴백.

### 2. 툴콜 영수증 + toolsEnabled 설정 토글

- `tool-loop.ts`에 `summarizeToolRuns`(지식 검색·최근 항목·노트 저장 라벨+한 줄
  요약, 실패는 ok=false) 추가. 답변 아래 `ToolRunReceipts` 영수증 표시 —
  `save_note`가 라이브러리를 변경하는 만큼 실행을 가리지 않는 투명성 계약.
- 설정 화면 채팅 섹션에 `chat.toolsEnabled` 토글(기본 켜짐값을 끌 수 있음).

### 3. 온보딩 첫 실행 체크리스트(데스크톱)

- 보관함(랜딩) 상단에 남은 첫 가치(AI 모델 준비·첫 캡처)를 보여주는
  `OnboardingChecklist`. 프로바이더별 가용 판정은 순수 로직
  (`onboarding-steps.ts`)으로 분리 — rules는 즉시 완료, local-server는 baseUrl,
  managed는 ready/active 모델 존재. 완료 시 자동 소멸, 닫으면 재노출 없음.

### 4. 웹 클리퍼 (브라우저 확장 + 로컬 엔드포인트)

- 동기화 서버에 **루프백 전용 `/v1/clipper`** 라우트: ① 루프백 발신만 허용
  ② 커스텀 헤더 `X-Glimpse-Clipper: 1` 필수(preflight 미응답으로 임의 웹페이지
  JS 차단, 헤더 없는 폼 POST는 검증 거절) ③ 기존 host 검증(DNS 리바인딩 방어)
  재사용. URL·제목·선택 텍스트 → note 지식 항목 저장 →
  `glimpse://clipper-captured` 이벤트로 웹뷰 보관함 쿼리 무효화
  (`useClipperCaptureListener`).
- `apps/clipper-extension/` — Chrome MV3 확장(팝업에서 선택 텍스트 저장, 포트
  설정, 상태 표시). 캡처 채널 중 유일한 데스크톱 브라우저 출처 경로 신설.

### 5. digest 내러티브 프롬프트 + 그래프 신뢰 장치 검토

- 내러티브 프롬프트를 정적 지시문 고정 + 가변 값(연결 수·기록 목록) 후행
  구조로 정리 — llama.cpp 프리픽스 캐시 재사용 구조. 하루 항목 수 단위 입력이라
  map-reduce 분할은 불필요 판정(근거: 외부 리서치 Q6).
- 그래프 신뢰 장치는 기존 구현으로 충족 확인 — 발견 카드·엣지 인스펙터가
  연결 근거(reason)를 표시하고 `hideRecommendation` 거절 경로가 존재.
  추가 작업 불필요.

### 6. 문서 정합화

- `docs/desktop-mobile-sync.md` 그래프 절의 "BYOK provider" 잔존 표기를
  관리형 GGUF/로컬 서버 서술로 수정.

---

## 검증

- 전체 bun 테스트(모바일+데스크톱+패키지), mobile/desktop typecheck, lint,
  cargo check, `cargo test --lib sync::server` — 모두 통과(커밋 시점 기준).
- 신규 테스트: embedding-index 순수 계약, 챗 생성 캐시 시나리오(적중·부분
  재임베딩·프룬·모델 교체·저장 실패·안전 상한), summarizeToolRuns, 온보딩
  스텝 판정, 클리퍼 페이로드 변환.

## 남은 것 (오너 수동 게이트 · 후속)

- 수동 게이트 소화: `thoughts/shared/research/2026-08-31_remaining-manual-gates.md`
  (Android 실기기 2 — `.a` 재생성으로 전제 소화됨, iOS 실기기 3, 계정 4 —
  **2026-09-21 전이 취약점 재검토 임박**, 데스크톱 GUI 1, 이관 분).
- 미착수 후보(플랜 비목표 유지): 캡처 이미지 바이트 저장(Rust 스키마 변경)·
  VL+mmproj 런타임 연결, HealthKit/워치 회고, LAN 추론 허브(v2),
  모바일 챗 임베딩 지속 캐시(현재는 후보 8개만 재순위).
- 클리퍼 확장은 스토어 배포 없이 개발자 로드 방식(README 참조).
