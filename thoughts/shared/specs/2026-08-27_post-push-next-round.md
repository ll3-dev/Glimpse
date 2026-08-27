---
date: 2026-08-27T16:20:00+0900
author: loopy
status: draft
type: feature
priority: high
---

# 사후 push 다음 라운드 — 잔여 과제 전체 SPEC

배포(EAS 자격증명 등 사용자 액션)와 GUI 수동 검증을 제외한 잔여 과제 9종을 단계별 순차(소규모 정리 → 인프라 안전망 → 대형 공사)로 실행한다.

## 문제

main push(be3b516) 이후 남은 과제들이 파편화되어 있다. 그래프 자동화는 실패 시 무한 재시도·큐잉 거짓 보고·24개 하드 리밋으로 데이터가 쌓일수록 비용이 커지고, 동기화 페이로드는 idle 상태에서도 항상 전체 스냅샷을 주고받으며, 추천 피드백은 영구 반영되어 사용자의 초기 거부가 평생 따라붙고, CI는 유닛 테스트만 지켜볼 뿐 실제 런타임을 검증하지 못한다. 이대로면 데이터 규모가 커질 때 동기화가 느려지고(중앙값 1–2MB 관찰 시 워터마크 전환이 필요하다는 것까지 리서치로 확인됨), iOS 네이티브 빌드는 여전히 재현 불가능한 상태로 남는다.

## 해결 목표

**현재:** (1) 그래프 자동화가 `graphQueued` 하드코딩(true, server.rs:196)·digest 미기록 무한 LLM 재실행(useKnowledgeGraphAutomation.ts:40-48)·MAX_ITEMS=24 증분 없음. (2) 동기화 서버가 병합 직전에 자기 전체 export+SHA256(server.rs:263-265), 더티 플래그 없음, 압축 없음(10k급=13MB/분 지속). (3) 추천 거절은 영구 반영(rejected_pairs 차단 + 태그 수 대소), 감쇠 없음. (4) CI에 브라우저 런타임 스모크 없음. (5) expo-modules-core × Xcode 16.4 호환 붕괴로 iOS 잡 green 0회. (6) ShareExtension 빌드 결함 미수리. (7) 모바일 임베딩은 BYOK 원격 API뿐 온디바이스 경로 없음. (8) 동기화는 완전 집합 전제 merge_exports — 델타 경로 부재.

**목표:**
- **1단계(소규모 정리):** 그래프 자동화가 실패를 기록하고 백오프하며, digest가 실제 입력과 일치하고, 24개 초과 입력도 누수 없이 처리한다. 동기화 idle 요청이 자기 해시 계산·전체 export를 생략하고, 변경 없는 폴링은 네트워크를 거의 타지 않으며, zstd 압축으로 대형 페이로드가 ~10분의 1로 줄어든다. 거절 피드백이 30일 시간 창 안에서만 유효해진다. rustra-core-client·useForegroundLabeling 중복 쌍이 수렴된다.
- **2단계(인프라 안전망):** Playwright 스모크가 PR마다 데스크톱 웹 뷰를 렌더링·검증하고(3분 이내), expo 업그레이드로 iOS 빌드가 Xcode 최신 버전에서도 컴파일되며, ShareExtension이 로컬 xcodebuild에서 정상 완료된다.
- **3단계(대형 공사):** 모바일에서 bridge-rust(nomic) 온디바이스 임베딩이 BYOK OFF일 때 의미 재정렬을 제공하고("Context is busy" 직렬화), 워터마크 델타 프로토콜(A안)이 additive 방식으로 도입되어 이후 동기화가 변경분만 주고받는다.

## 성공 기준

- [ ] 그래프 자동화: 실패 시 digest 미기록 재시도가 백오프로 바뀌고(테스트로 검증), `graphQueued` 거짓 보고 제거, 24개 초과 입력 처리 경로가 테스트됨
- [ ] 동기화 값싼 3종: 자기 해시 순서 변경 + 더티 플래그로 idle export 생략(단위 테스트), zstd 압축 양단 협상 적용 및 대형 픽스처에서 페이로드 감소 측정 기록
- [ ] 거절 페널티 시간 창: 30일 이전 거절이 추천 차단에 영향 없음(신규 테스트)
- [ ] Playwright 스모크 잡이 CI 메인 레인에서 green (vite preview + isTauriRuntime 폴백 가드)
- [ ] expo 업그레이드 후 `bun run ios` 로컬 빌드 성공 또는 명시적 실패 원인 기록(iOS CI pin best-effort와 분리)
- [ ] ShareExtension 포함 xcodebuild 로컬 성공
- [ ] 온디바이스 임베딩: mobileProfile에 nomic embedding 모델 추가, BYOK OFF→ON 전환 시 온디바이스 경로 동작(원격 폴백 우선순위 명시)
- [ ] 워터마크 A안: migration 0004 인덱스, per-peer 워터마크+24h 가드밴드, merge_exports 증분 적용 경로(row upsert + 툼스톤) 유닛 테스트, v1 클라이언트 호환 스냅샷 유지
- [ ] 전체 게이트 통과: bun test, cargo test(core + src-tauri), lint

## 범위 제한

- **제외 — 배포:** EAS 자격증명 등록, store 심사 준비(사용자 액션)
- **제외 — GUI 수동 검증:** 데스크톱 의미 정렬 실측, 모바일 BYOK 토글 실기기 확인, sync 실기기 반영(별도 세션)
- 워터마크 B안(per-record HLC) 착수 금지 — A안만
- `@wdio/tauri-service` macOS E2E 금지(P4, 실사용 플로우 확정 후)
- iOS CI 잡은 Xcode pin best-effort까지만 — 근본 수리는 expo 업그레이드 결과에 위임
- zstd는 선택적 협상(gateway 미지원 시 fallback)으로 구현 — hard failure 아님
- 그래프 증분 처리는 digest 정합성 수준까지; 완전 증분 파이프라인은 다음 라운드

## 참고 자료

- 리서치: `thoughts/shared/research/2026-08-27_13-07-25_large-next-steps.md` — 값싼 3종·워터마크 A/B안·CI P1-P4
- 리서치: `thoughts/shared/research/2026-08-26_15-20-14_next-improvement-opportunities.md` — 그래프 자동화 결함 3건(A2영역), 중복 쌍
- 리서치: `thoughts/shared/research/2026-08-27_00-24-30_post-execution-audit.md` — 이전 라운드 출발점
- 그래프: `apps/desktop/src-tauri/src/sync/server.rs:196`(graphQueued), `apps/desktop/src/features/knowledge-graph/useKnowledgeGraphAutomation.ts:40-48`
- 동기화: `apps/desktop/src-tauri/src/sync/server.rs:263-265,351-357`, `packages/core-rust/src/storage/sqlite/sync.rs:24-30,270-282`
- 추천 거절: `packages/features/src/recommendation/index.ts:59-120`
- 모바일 sync 클라이언트: `apps/mobile/src/features/sync/sync-client.ts`, `useAutoSync.ts`
- 온디바이스 임베딩 전제: bridge-rust `LoadModelOptions.embedding/poolingType`, nomic mobileProfile, "Context is busy"
- ShareExtension: `apps/mobile/ios/ShareExtension/` (ShareViewController.swift, preprocessor)
- rustra bridge 가이드: `apps/mobile/docs/rustra-bridge-development.md`
