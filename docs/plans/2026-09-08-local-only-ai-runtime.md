# 완전 로컬 AI 런타임 전환 — 구현 플랜 (2026-09-08)

## 배경 · 결정

- 오너 결정: **클라우드 BYOK(openai/anthropic/google/deepseek 프리셋 + API 키)를 전면 제거하고 완전 로컬로 간다.** 근거와 판단 기록: `thoughts/shared/research/2026-09-08_ai-model-selection-under-constraints.md`의 "결정 갱신" 섹션.
- "로컬"의 정의(3계층):
  1. **앱 내 관리 런타임** — 데스크톱 llama.cpp, GGUF 자동 다운로드(기존 model-manager 경로).
  2. **외부 로컬 서버** — LM Studio·Ollama·mlx-lm server 등이 여는 OpenAI 호환 localhost 엔드포인트. **자동 감지 우선, 수동 URL 입력만 받는다.** 품질이 필요한 사용자가 큰 모델을 쓰는 탈출구.
  3. **모바일** — Apple Foundation Models(무료·온디바이스) + 큐레이션된 llama.rn 모델.
- MLX는 외부 런타임 경로로 지원한다(LM Studio의 MLX 엔진 등). 앱 내 관리 포맷은 GGUF 단일화해서 복잡도를 유지한다.

## 목표

1. 클라우드 BYOK 코드·설정·키 저장(키체인) 제거 + 기존 키 정리 마이그레이션.
2. 데스크톱: 로컬 서버 자동 감지(포트 프로브) + "감지됨 — 사용" 원클릭. 설정은 URL 정도만.
3. 관리 런타임 추천 모델 큐레이션 — 데스크톱(배경 소형 / 챗·요약 중형), 모바일(선택지를 2~3종으로 좁힌 쉬운 다운로드).
4. 임베딩의 로컬 경로 확정(기존 모바일 BYOK `/embeddings` 제거 대응).
5. 챗 tool-calling: OpenAI 포맷 스키마 유지(로컬 서버가 동일 포맷), 미지원 시 기존 RAG 폴백 체인 유지.

## 비목표

- 클라우드 프로바이더를 숨김 옵션으로라도 유지하는 것 — 완전 제거.
- 모바일→데스크톱 LAN 추론 허브(모바일이 데스크톱의 로컬 서버를 쓰는 구성) — 유망한 후보지만 v2로 기록만.
- 임베딩 지속 인덱스(우선순위 ②) — 단, 로컬 임베딩은 생성이 느리므로 사실상 ②와 함께 진행해야 유용하다.
- 파인튜닝·로컬 학습, MLX 네이티브 번들.

## 설계

### 1) 데스크톱 설정 스키마 전환 (`apps/desktop/src/lib/settings-storage.ts`)

- `aiProvider: 'local-llm' | 'byok' | 'rules'` → `'managed-llm' | 'local-server' | 'rules'`(기본 `managed-llm`).
- `byok { provider, apiKey, baseUrl, model }` 블록 제거 → `localServer { baseUrl, model, detectedFrom: 'lmstudio' | 'ollama' | 'llamacpp' | 'manual' }`.
- 기존 `byok-provider.ts`의 custom + baseUrl 메커니즘이 사실상 동일하므로 `local-server-provider.ts`로 전용(재명명·수정)한다 — 삭제가 아니라 재활용.
- 키체인 시크릿 저장/마이그레이션 코드 제거 + 기존 키 삭제.
- **자동 감지**: 설정 화면 진입·앱 시작 시 `localhost:1234`(LM Studio), `localhost:11434`(Ollama), `localhost:8080`(llama.cpp/mlx-lm)의 `/v1/models`를 짧은 타임아웃으로 프로브. 감지 결과를 "LM Studio 발견 — 이 모델 사용" 원클릭 UI로.

### 2) 관리 런타임 큐레이션 (데스크톱, GGUF)

하드 큐레이션(구현 시 벤치마크 확인 후 확정):

| 용도 | 후보 | 비고 |
|---|---|---|
| 배경(라벨링·임베딩) | 2B급 Q4(현 qwen3.5-2b 계열 유지) | 항상 떠 있어도 부담 없음 |
| 챗·오늘 요약 | 8~9B급 Q4(16GB) / 14B급(24GB+) — qwen3-8b·gemma-4-E4B 계열 후보 | RAM 가이드·용량 표시와 함께 |

모델 다운로드는 기존 HuggingFace model-manager 경로 재사용. 목록은 앱 업데이트로 갱신(기본값 최신화 원칙 유지).

### 3) 모바일 (`apps/mobile/`)

- `targets/registry.ts`에서 byok kind 제거 — 남는 kinds: apple / local / rules / stub(+요약 플랜의 `summary` 기능).
- `stores/settings/byok.store` 제거.
- **추천 모델 2~3종으로 선택지 좁히기**: 경량(1.7~2B Q4) / 균형(4B급) + Apple FM 기본. 다운로드 UX: 용량·Wi-Fi 안내, 원클릭. 딥 유저는 모델 파일 수동 임포트 유지(문서화만).
- 검색 리랭크의 BYOK `/embeddings` 경로 제거 → 로컬 임베딩(llama.rn 임베딩 모델 또는 Apple NaturalLanguage 임베딩)으로 대체. 구현 시 품질 비교 후 확정.

### 4) 챗 tool-calling (`apps/desktop/src/features/ai/tools/`)

- 스키마는 OpenAI 포맷 유지 — LM Studio·Ollama의 OpenAI 호환 엔드포인트가 같은 포맷을 말한다.
- 로컬 서버의 툴콜 지원은 모델별 편차가 크므로 기존 "미지원 감지 시 RAG 폴백" 체인을 그대로 유지.

### 5) 마이그레이션

- 기존 byok 설정 보유 사용자(사실상 오너 1명): 시작 시 일회성 안내 후 설정을 새 스키마로 초기화, 키체인 키 삭제.
- 관련 테스트 전면 갱신(settings-storage, router, registry, rerank 등).

## 작업 순서

1. 데스크톱 설정 스키마 + 프로바이더 전용 + 자동 감지 (위험 최대 구간을 먼저).
2. 모바일 byok 제거 + 추천 모델 큐레이션.
3. 임베딩 로컬 경로 전환.
4. digest 내러티브 플랜(`2026-09-08-digest-ai-narrative.md`)과 통합 검증 — 해당 플랜은 이 전환 완료 전제로 로컬 경로만 소비한다.

## 검증

- `bun test` 3종 스위트(모바일/데스크톱/features) 갱신 통과, `bun run lint`, 타입체크.
- 수동 게이트: LM Studio·Ollama 실행 시 자동 감지→챗·툴콜 동작 / 감지 실패 시 수동 URL 입력 흐름 / 키체인에서 키 실제 삭제 확인 / 모바일 추천 모델 원클릭 다운로드→라벨링·챗 동작 / Apple FM 기기에서 요약 생성.

## 리스크

- 로컬 서버 툴콜 편차 → 기존 폴백 체인으로 흡수.
- 모바일 로컬 챗 품질 한계 → Apple FM + 큐레이션으로 하한 유지, 기대치는 문서화("모바일 챗은 보조용").
- 자동 감지 오탐(다른 서비스가 같은 포트 사용) → 감지 결과를 항상 사용자 확인형 원클릭으로만 적용.
