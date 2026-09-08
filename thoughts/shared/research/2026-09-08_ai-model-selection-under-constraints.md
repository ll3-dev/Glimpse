# AI 모델 선택 — 한정된 자원 내 운용 판단 (2026-09-08)

## 질문

"괜찮은 모델을 쓰되, 한정된 자원 내에서 어떻게 사용할 것인가."

자원을 4가지로 분해하면 판단이 명확해진다.

1. **BYOK API 예산**($/월)
2. **로컬 하드웨어** — 데스크톱 llama.cpp 관리 런타임(현 기본 `qwen3.5-2b-q4`), 모바일 llama.rn
3. **모바일 배터리·지연 시간** — 백그라운드 작업(라벨링 등)이 로컬 LLM으로 돌면 소모 큼
4. **품질 하한** — 출력 품질이 낮으면 신뢰를 잃고 앱을 다시 안 쓰게 됨(실사용 문제의 재발)

## 결론 요약

1. **개인 규모 트래픽에서는 API 달러가 병목이 아니다.** 아래 시뮬레이션에서 월 $2~3 수준. 진짜 병목은
   (a) **낡은 기본값** — 데스크톱 BYOK 기본 `gpt-4o-mini`는 2026-09 기준 2세대 전 모델,
   (b) **모바일 백그라운드의 무료 경로 부재** — Apple Foundation Model이 metadata/labeling만 지원,
   (c) **챗 재임베딩 낭비** — 메시지마다 최대 100건 재임베딩(임베딩 인덱스 과제와 직결),
   (d) **모델 1개가 전 기능을 공유** — 챗 품질과 배경 작업 비용이 하나의 설정에 묶여 있음.
2. **트래픽 등급별 라우팅이 정답**인데, 모바일은 이미 kind 기반 라우팅(`apps/mobile/src/features/ai/targets/registry.ts`)이 존재하고 데스크톱은 provider 체인(preferred→rules→stub)이 존재한다. 부족한 것은 기본값 교체, `summary` 기능 추가, 그리고 (후속) 백그라운드 전용 모델 슬롯.
3. 남는 결정은 하나: **챗 기본을 mid 티어로 묶을지 frontier로 묶을지**(월 $2 vs $5 차이).

## 2026-09 가격 스냅샷

> 애그리게이터 간 수치 편차가 크다. 대략적 티어 판단용이며, 도입 전 공식 페이지(OpenAI/Anthropic/Google/DeepSeek pricing)에서 확정할 것. DeepSeek는 공식 문서 기준이라 신뢰도 높음.

| 티어 | 모델(예) | 입력/출력 $/1M토큰 | 비고 |
|---|---|---|---|
| Ultra-cheap | DeepSeek V4 Flash | ~$0.22 / ~$0.66 | 2026-08-16 재가격 후, 오프피크 할인. 공식 문서 기준 |
| Ultra-cheap | GPT-5 nano급 | ~$0.05~0.20 / ~$1.25 | 애그리게이터 편차 큼 |
| Cheap | Gemini Flash-Lite급 | ~$0.25 / ~$1.50 | |
| Mid | GPT-5 Mini급 | ~$1.50 / ~$6.00 | 애그리게이터 편차 큼 |
| Mid | Gemini Flash급 | ~$0.50 / ~$3.00 | |
| Frontier | GPT-5급 | ~$5 / ~$15 | |
| Frontier | Claude Sonnet 5급 | ~$3 / ~$15 | 2026-09 인상 보도 |
| 임베딩 | text-embedding-3-small급 | ~$0.02 / — | 고트래픽엔 로컬(bge-m3, qwen3-embedding)이 유리 |

로컬(Apple Silicon, Q4, 16GB 기준): **qwen3-8b / qwen3.5-9b급**이 챗·작문용 주력 추천, **gemma 4 E4B(MoE)**가 속도 중시 대안. 현 기본 `qwen3.5-2b-q4`는 배경 작업용으론 적절하나 챗용으론 부족.

## 트래픽 등급 × 권장 매트릭스

| 기능 | 트래픽/성격 | 모바일 권장 | 데스크톱 권장 |
|---|---|---|---|
| 라벨링·메타데이터 | 높음·저위험 | **Apple FM**(없으면 rules/stub) | local(qwen 소형) 또는 rules |
| 그래프 엣지 제안 | 중간·배치 | (모바일 비대상) | BYOK cheap 또는 local |
| 오늘 요약 내러티브 | 1~3회/일·품질 민감 | **Apple FM summary 타깃(신규)** → BYOK cheap 폴백 | BYOK(현 byok.model) 또는 local |
| 챗 | 사용자 시작·품질 최우선 | **BYOK 우선**, local은 폴백 | **BYOK mid~frontier**, local은 폴백 |
| 임베딩(검색·RAG) | 지속·고트래픽 | BYOK 임베딩 API + 캐시 | local bge/qwen3-embedding 또는 API |

원칙: **높은 트래픽×낮은 위험 → 무료 경로(Apple FM/local/rules), 낮은 트래픽×높은 품질 → 유료 mid~frontier.** 챗만이 frontier를 쓸 자격이 있고, 나머지는 cheap 이하로 충분하다.

## 월 예산 시뮬레이션

가정: 캡처 30건/일, 챗 10메시지/일, 오늘 요약 2회/일, 그래프 배치 1회/일. 토큰 추정 — 라벨링 ~600in/150out, 챗 ~2.5kin/600out, 요약 ~1.5kin/300out, 엣지 제안 배치 ~3kin/1kout.

| 시나리오 | 구성 | 월 추정 비용 |
|---|---|---|
| 전 로컬/온디바이스 | 배경+요약=Apple FM/local, 챗=local | **$0** (품질 하한 위험) |
| 절춘(권장) | 챗=mid, 배경·요약=ultra-cheap 또는 무료 | **~$2~3** |
| 챗 frontier | 챗=frontier, 나머지 동일 | **~$5~7** |

즉 "한정된 예산"이라는 제약 자체는 개인 규모에선 느슨하다. 비용 폭발 위험은 토큰 낭비(재임베딩, 캐시 없는 호출)에서 오지 않은 모델 선택에서 오지 않는다.

## 구조 레버 (우선순위)

1. **기본값 교체(설정만)** — 데스크톱 `byok.model` 기본 `gpt-4o-mini` → 현재 mini급. 코드 변경 최소, 즉시 품질 향상.
2. **모바일 `summary` AIFeature 추가** — `types.ts`의 `AIFeature`에 `summary` 추가, Apple FM featureSupport 확장, BYOK/local도 지원. 오늘 요약 내러티브 플랜(`docs/plans/2026-09-08-digest-ai-narrative.md`)과 결합.
3. **BYOK 모델 슬롯 분리(후속)** — `byok.model`(챗) + `byok.backgroundModel`(라벨링·요약·그래프, 기본 ultra-cheap). "챗은 좋은 모델, 배경은 싼 모델"을 가능하게 하는 실질적 레버. 모바일은 이미 기능별 타깃 분리가 있어 데스크톱만 해당.
4. **월 토큰 예산 캡** — 설정에 상한 추가, 초과 시 기존 폴백 체인(preferred→rules→stub)으로 강등. 예측 가능성 확보.
5. **임베딩 지속화** — 별도 과제(우선순위 ②)이지만 비용·품질 양쪽에 직결. 챗의 100건 재임베딩을 없애야 유료 임베딩 도입도 안전.

## 결정 갱신 (2026-09-08, 동일일 후속 논의)

오너 결정: **클라우드 BYOK를 전면 제거하고 완전 로컬로 간다.** 구현 플랜: `docs/plans/2026-09-08-local-only-ai-runtime.md`.

- 근거: 개인 운영 제품에 맞음 — 반복 비용 없음, 프라이버시, 외부 의존 제거. 로컬퍼스트가 2026년 시장 신호(Granola)이기도 하다.
- "로컬"의 정의를 3계층으로 확장해 품질 하한 문제를 완화한다: (1) 앱 내 관리 런타임(llama.cpp, GGUF 자동 다운로드), (2) **외부 로컬 서버**(LM Studio·Ollama·mlx-lm 등 OpenAI 호환 엔드포인트, 자동 감지) — 데스크톱에서 30B급 큰 모델을 쓸 수 있는 탈출구, (3) 모바일은 Apple Foundation Models + 큐레이션된 로컬 모델.
- 위 시뮬레이션의 "API 예산" 축은 폐기. 자원 축은 로컬 하드웨어·배터리·품질 하한·모델 다운로드 용량으로 재정의.
- 아래 "결정 필요 사항"(챗 티어, 월 예산 캡)은 폐기 — 비용 자체가 사라짐.

## 결정 필요 사항 (구현 착수 전)

- 챗 기본 티어: mid(권장, 월 ~$2) vs frontier(월 ~$5~7).
- 실제 보유 프로바이더/키와 월 예산 상한 — 기본 제안: **월 $5 캡**.

## 출처

- DeepSeek 공시 가격: https://api-docs.deepseek.com/quick_start/pricing
- 가격 비교(편차 주의): https://gitautoreview.com/tools/llm-pricing , https://tldl.io (LLM API pricing), https://www.ai-toolbox.co , https://aimagicx.com
- 로컬 모델: https://apxml.com/posts/best-local-llm-apple-silicon-mac , https://www.promptquorum.com/local-llms/best-local-llms-2026 , https://willitrunai.com/blog/best-llm-for-16gb-mac
- 임베딩: https://milvus.io/blog/choose-embedding-model-rag-2026.md , https://www.premai.io/blog/best-embedding-models-for-rag-2026-ranked-by-mteb-score-cost-and-self-hosting/ , https://openrouter.ai/collections/embedding-models
