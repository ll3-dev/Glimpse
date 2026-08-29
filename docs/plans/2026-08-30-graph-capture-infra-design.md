# 그래프 가치 실현 + 캡처 진입 + 인프라 고도화 설계

- 날짜: 2026-08-30
- 상태: 승인됨 (트랙 A + 트랙 B 병행, 1+3 병행 전략)
- 연관 문서: `docs/plans/2026-08-28-mdns-local-sync-design.md`(Goal 2·3 계승), `docs/desktop-mobile-sync.md`
- 목표: 모든 단계를 테스트 게이트로 검증하며 진행. 변경 사항은 커밋 전마다 확인.

## 배경

핵심 루프(캡처→AI 정리→복습→양방향 동기화)가 완성·실기기 검증된 시점. 남은 제품 천장은 두 가지:

1. **그래프 입력 상한** — `selectGraphSourceWindow`가 최신 24개(`GRAPH_INPUT_ITEMS = 24`)만 분석. 지식이 쌓일수록 옛날 지식이 그래프에서 영구 배제되어 "지식이 연결되어 가치를 만든다"는 제품 약속이 깨짐.
2. **캡처 진입 결함** — ShareExtension 빌드 결함이 메모리에 기록된 상태. 공유 시트는 볼륨 1 진입 경로이자 그래프의 원료 공급원.

인프라 측으로는 rustra `=0.1.3` → `0.4.0` lockstep과 sync 로직 공유 Rust 통합(mDNS 설계 Goal 2·3)이 대기 중. 사용자 확정: 트랙 A(제품) + 트랙 B(인프라) **병행** 진행.

## 전체 로드맵 구조

```
Phase 0  ─ A1. ShareExtension 빌드 결함 수리          (작고 독립, 즉시)
Phase 1  ─ A2. 그래프 증분 파이프라인  ⫓ 병행 ⫓  B1. rustra 0.4.0 lockstep
Phase 2  ─ A3. 모바일 "연결된 노트" 뷰  ⫓ 병행 ⫓  B2. sync 로직 공유 Rust 통합
```

- A1이 Phase 0인 이유: 캡처 진입이 그래프의 원료 공급원이며, 가장 작은 독립 수리.
- Phase 1 터치포인트는 딱 하나 — `sync-complete` 이벤트 구독 지점. **B1의 이벤트 배선을 A2 워커 확장보다 먼저 랜딩**하는 규칙으로 충돌 방지.
- Phase 2 종속성: A3는 A2가 만든 과거 아이템 엣지가 있어야 체감 가치가 생김. B2는 B1 위에서만 가능.

병행 리스크 관리: 커밋은 트랙 프리픽스 분리(`feat(graph)` vs `feat(bridge)`), 게이트는 트랙 무관 전체 통과 기준(기존 bun test 706+, cargo test 106+ 자산이 안전망).

---

## 트랙 A — 그래프 가치 실현 + 캡처 진입

### A1. ShareExtension 빌드 결함 수리 (Phase 0)

- ShareExtension 타깃 빌드 재현 → 결함 특정 → 수리.
- UI 현대화 커밋에서 매니페스트 키 재정렬이 이뤄졌으므로, 남은 결함은 브리지 의존성 또는 엔타이틀먼트 쪽 가능성(30706e9 커널 케이퍼빌리티 함정과 유사 패턴).
- **게이트:** `bun run ios` 실기기 빌드 + 공유 시트 → 앱 진입 → 저장 E2E 수동 확인.

### A2. 그래프 증분 파이프라인 (Phase 1)

**아이템 분석 상태 모델:**

```
unanalyzed   — 엣지 없음, 분석된 적 없음
analyzed:v1  — 엣지 존재, digest 기준 미변경
stale        — 엣지 존재, 내용 변경됨 (updatedAt > analyzedAt)
```

**증분 사이클** (`sync-complete`마다):
1. 신규/변경(stale) 아이템만 LLM 배치 분석
2. 기존 analyzed 아이템 중 신규 아이템과 연결 가능성이 있는 것만 재검증 후보로
3. 엣지 저장소 병합 — 기존 엣지 유지 + 새 엣지 추가 + 삭제된 아이템 엣지 정리

**재검증 후보 산정:** 신규 아이템의 태그·임베딩 유사도로 상위 K개(기본 20)만 재검증 — 전체 N개 재분석 회피가 핵심.

**비용 가드:**
- 배치 크기 상한(기본 1사이클 최대 8개), 미분석 백로그는 최신 우선 처리
- LLM 없으면 기존처럼 공유 태그 결정론 폴백 유지

**호환성:** 기존 24개 윈도우는 삭제하지 않고 "콜드스타트 상한"으로 유지 — 첫 실행 시 최신 24개 먼저, 이후 증분으로 확장.

**저장:** 엣지에 `analyzedAt`/`sourceDigest` 메타 추가 (기존 recommendations 테이블에 컬럼 또는 메타 JSON).

**게이트:** 증분 로직 단위 테스트(상태 전이·후보 산정·병합), `generate-knowledge-graph.test.ts` 회귀, `bun run sync:e2e` 이후 GUI 확인.

### 데스크톱 그래프 뷰 보강 (A2에 얹음)

- 노드 클릭 → 연결 아이템 하이라이트·근거 표시 (기존 `KnowledgeGraph.tsx` 확장).

### A3. 모바일 "연결된 노트" 뷰 (Phase 2)

- 라이브러리 아이템 상세 하단에 **"연결된 노트 N"** 섹션 — 엣지는 양방향 동기화 대상이므로 모바일은 읽기 전용 표시만 (생성은 데스크톱 전담 유지).
- 노드 탭 → 해당 아이템으로 앱 내 네비게이션.
- 표시 근거: LLM 관계 설명 한 줄 + 공통 태그 배지.
- **의도적 범위 제외:** 모바일 그래프 시각화, 모바일 측 생성 — YAGNI.

---

## 트랙 B — 인프라 고도화

### B1. rustra 0.4.0 lockstep (Phase 1)

mDNS 설계 Goal 2 계획 계승:

1. Cargo 핀 `=0.1.3` → `=0.4.0`, `@rustra/types`·`tauri`·`react-native` 0.4.0 lockstep 갱신.
2. JSI C++을 통합 FFI 심볼(`rustra_ffi_invoke_rkyv_v2[_into][_async]`, caller-buffer)로 정렬, `getContractHash` 노출.
3. 이벤트 네이티브화 — 모바일 로컬 허브 → JSI `onEvent` 구독, 데스크톱은 `@rustra/tauri` `subscribeEvent` 채택.
4. `bun run bridge:generate` 재생성 (0.3.0+ codegen 산출물 반영).
5. **게이트:** `expectContractCurrent` 계약 게이트, cargo test, bun test, lint + 시뮬레이터 LLM 스트리밍·모델 다운로드 이벤트 실동작 확인.

릴리스 노트 기반 체크리스트: 0.3.0 비동기 invoke 고정 풀(2 worker/256 queue) 포화 거절 동작, 0.4.0 lazy zero-config bootstrap 진입점 확인.

**병행 규칙:** B1을 A2보다 먼저 랜딩 — `sync-complete` 이벤트 배선을 그래프 워커 확장 전에 고정.

### B2. sync 로직 공유 Rust 통합 (Phase 2)

mDNS 설계 Goal 3 계획 계승:

- `bridge-rust`에 `sync_discover(timeout_ms)` — 트레잇 뒤 백엔드: desktop=`mdns-sd`, iOS=dnssd C API(entitlement 불필요), Android=Rust→JNI→NsdManager 직접 호출(사용자 확정).
- `sync_plan(config, candidates)` — 엔드포인트 우선순위·재시도/백오프·워터마크 판단을 Rust로 이동. 데스크톱 서버와 같은 크레이트 로직 공유.
- HTTP 전송은 JS fetch 유지 (토큰 보안·gzip·타임아웃 계약이 이미 JS에 안착).
- TS는 얇은 어댑터만 남기고 판단 로직 제거.
- **게이트:** 백엔드별 cargo 테스트(desktop 실제 실행, iOS cfg 게이트), 어댑터 bun 단위 테스트, 시뮬레이터 발견→페어링→동기화 재검증.

---

## 명시적 범위 외 (이번 사이클)

- Android 실기기·BGTaskScheduler 실기기 검증 (환경 제약 유지)
- EAS 자격증명 — 배포 결심 시 별도 세션으로
- 모바일 그래프 시각화, 웹 클립버드 등 신규 진입 채널
- 그래프 완전 증분 이외의 워터마크 B안(HLC), wdio E2E (기존 SPEC 제외 유지)

## 전체 검증 원칙 (사용자 요구 반영)

- 모든 단계는 구현 → 단위 테스트 → 게이트(cargo test + bun test + lint) → 플랫폼 스모크 순으로 진행.
- 각 변경은 커밋 단위로 잘라 커밋 전 diff 확인, 트랙 프리픽스로 분리.
- GUI 수동 확인 항목(A1 공유 시트, A2 그래프, B1 스트리밍)은 세션 종료 전 체크리스트로 명시.
