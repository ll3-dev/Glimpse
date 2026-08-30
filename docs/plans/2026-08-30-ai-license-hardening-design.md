# AI 결함 수리 + MIT 전환·배포 준비 + 모델 라이선스 검증 — 설계

날짜: 2026-08-30
상태: 승인됨 (/goal 지시 — MIT 전환·모델 전수 체크·개발까지 진행)
근거 리서치: `thoughts/shared/research/2026-08-30_22-15-27_ai-verification-and-licenses.md`

## 목표

1. 리서치에서 발견된 AI 결함(P1)을 수리한다 — 특히 백그라운드 경로의 레이스.
2. 프로젝트 라이선스를 독점 → MIT로 전환하고 배포 가능한 상태(노티스 포함)로 만든다.
3. 모델 카탈로그 34개 엔트리의 라이선스를 외부 소스로 전수 검증하고, 문제 있는 모델을 플래그한다.

## 결정 사항

| 결정 | 선택 | 이유 |
|---|---|---|
| 라이선스 전환 | LICENSE → MIT | 사용자 승인 ("MIT로 넘어가도 될꺼 같지만") |
| 커스텀 라이선스 모델 | 제거하지 않고 `licenseKind` 플래그 + UI 경고 | 되돌릴 수 있는 보수적 선택; 사용자 선택권 유지 |
| 기본 추천 모델 | LFM2.5(커스텀) → qwen3.5-2b-q4(Apache-2.0) | 배포 안전성 + 데스크톱 기본과 정렬; LFM2.5는 카탈로그 유지 |
| 죽은 inference-mode 시스템 | 삭제 | ai-targets가 완전 대체, 모순된 기본값 보유 |
| 범위 외 | 영구 벡터 저장소·모바일 BYOK 스트리밍·실모델 자동 테스트 | 대형 별도 과제 — 백로그 문서화 |

## 트랙 1 — 라이선스 기반

- `LICENSE` 교체: MIT, `Copyright (c) 2026 ll3-dev`.
- `license: "MIT"` 추가: 루트 package.json, `packages/{bridge-rust,core-rust,features,hooks,shared,ui}/package.json`, `apps/mobile/package.json`, `apps/desktop/package.json`, Cargo 크레이트 3개(`packages/bridge-rust`, `packages/core-rust`, `apps/desktop/src-tauri`)의 `[package] license`.
- `THIRD-PARTY-NOTICES.md` (루트): npm 허용 라이선스 목록 + MPL-2.0 항목(lightningcss 등) + Rust 크레이트 + 폰트(OFL) + 모델 라이선스 요약. `scripts/generate-notices.ts`로 재생성 가능하게 하고 `package.json`에 `licenses:generate` 스크립트 추가.
- README에 License 섹션 추가.

## 트랙 2 — 모델 카탈로그 검증

- 구현 전 HuggingFace 모델 카드에서 각 패밀리 라이선스를 확인한다 (레지스트리 자기표신 신뢰 금지). 확인 결과를 리서치 문서에 추적.
- `LocalModelDefinition`에 `licenseKind?: 'permissive' | 'custom'` 추가. Apache-2.0/MIT 계열 = permissive, 그 외(LFM 1.0, Kanana, EXAONE, HyperCLOVA X, Gemma 등) = custom.
- `ModelDownloadCard.tsx` (+상세 위치): `licenseKind === 'custom'`이면 다운로드 전 경고 문구 표시 — "이 모델은 커스텀 라이선스예요. 상용 배포 시 라이선스를 확인하세요."
- 기본 추천 교체: `qwen3.5-2b-q4.mobileProfile.recommended = true` (rank 조정 포함), LFM2.5는 recommended 제거 + caveat에 라이선스 문구 추가. 데스크톱 기본 id(`'qwen3.5-2b-q4'`)와 자연 정렬.
- 라이선스 누락 5개 데스크톱 엔트리(glm-4.7-flash, phi-4-reasoning, magistral-small, devstral-small, ministral-3-14b) 필드 채우기.

## 트랙 3 — P1 AI 결함 수리

1. **BYOK 타임아웃**: 모바일 `byok-provider.ts`(metadata), `executors.ts`(chat/labeling fetch), 데스크톱 `byok-provider.ts` — `AbortSignal.timeout(30_000)` 부착, 타임아웃 에러 코드 신설(`AI_PROVIDER_TIMEOUT` 실제 생산).
2. **BYOK 메타데이터 hydration 가드**: `providers/byok-provider.ts`가 스토어 직접 조회 전에 `ensureBYOKHydrated()` 대기.
3. **getLabelVersion**: `case 'byok':`을 rules가 아닌 AI 라벨러 버전으로.
4. **타깃 모델 핀**: `executeLocalChatTarget`/`resolveBYOKChatConfig`가 `target.modelId`/`target.model`을 우선 사용, 없으면 기존 라이브 스토어 폴백.
5. **데스크톱 공칭 응답 제거**: `router.ts` 빈 텍스트 시 조립 대신 에러 반환(호출부가 기존 에러 UI 경로 사용).
6. **데스크톱 라벨링 라우터 정합**: `run-foreground-labeling.ts`가 `deriveRuleBasedLabels` 직접 호출 대신 설정 provider 경유(aiProvider=rules면 기존과 동일).
7. **백그라운드 언로드 레이스**: 라벨링 백그라운드 태스크 실행 중에는 `useReleaseLocalLLMOnPressure`의 지연 언로드를 보류하는 keep-alive 가드(모듈 레벨 카운터) 도입.
8. **죽은 코드 제거**: `inferenceMode.commands.ts`, `inference-mode.store.ts`, `features/core/application/state/inference-mode.ts`(+테스트), 참조 지점(`local-core-store.ts`, `state/index.ts`) 정리. 데드 Effect 변형·stream-events 구독 헬퍼는 이번 범위에서 유지(외부 API 가능성 — 별도 판단).
9. **Android 매니페스트 정합**: 체크인된 `AndroidManifest.xml`에 `RECEIVE_BOOT_COMPLETED` 수동 추가 (prebuild 전체 재실행 회피).

## 검증 게이트

- `bun test` (모바일 전체) + `bun run lint` + `bun run typecheck`
- `cargo check` + 크레이트 테스트 (변경 크레이트)
- 데스크톱: `bun run desktop:typecheck` / `desktop:lint`
- 모델 레지스트리: 신규 유닛 테스트(licenseKind 필수성·기본 추천이 permissive인지 단언)
- 노티스: 생성 스크립트 1회 실행 결과 커밋

## 리스크

- 라벨링 라우터 정합(6)으로 데스크톱 라벨링이 rules 외 provider를 처음 사용 — rules 기본값이라 기본 동작 불변.
- 타깃 모델 핀(4)은 저장된 타깃이 낡은 모델을 가리킬 수 있음 — 폴백 로직으로 완화(핀 없으면 기존 동작).
- MIT 전환 후에도 기여 문서에 CLA 등은 없음 — 단순 라이선스 표기 전환으로 충분.
