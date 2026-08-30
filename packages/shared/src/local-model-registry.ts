export type LocalLLMModelFamily =
  | "embedded-chat"
  | "qwen-chatml"
  | "qwen"
  | "lfm2"
  | "llama"
  | "mistral"
  | "phi"
  | "nomic"
  | "gemma"
  | "glm"
  | "generic-instruct";

export type ModelCapability =
  | "chat"
  | "embedding"
  | "tools"
  | "code"
  | "reasoning"
  | "vision";

export type ModelPlatform = "mobile" | "desktop" | "both";

export type MobileModelTier = "compact" | "balanced" | "quality";

export type GGUFSource = "publisher" | "community";

export type MobileModelRuntime = "llama-rn" | "bitnet-cpp" | "mnn";

/** 라이선스 성격 — permissive(Apache/MIT 등 허용적) 또는 custom(조건부 허용) */
export type ModelLicenseKind = "permissive" | "custom";

export interface MobileModelProfile {
  /** Display order in the curated mobile catalog */
  rank: number;
  /** Device-oriented performance tier */
  tier: MobileModelTier;
  /** Primary recommendation for most supported phones */
  recommended?: boolean;
  /** Short, user-facing strengths */
  strengths: string[];
  /** Important runtime trade-off */
  caveat?: string;
  /** Runtime required to execute the downloadable artifact */
  runtime?: MobileModelRuntime;
  /** Marks models that are runnable but still need broader device validation */
  experimental?: boolean;
  /** Purpose-trained or packaged at two bits per weight or below */
  lowBit?: boolean;
  /** Override for the inferred minimum physical memory requirement */
  minRamGb?: number;
}

export interface LocalModelDefinition {
  /** Unique model identifier (also used as filename stem) */
  id: string;
  /** Human-readable name */
  name: string;
  /** HuggingFace repository for downloading */
  repo: string;
  /** GGUF filename in the repository */
  filename: string;
  /** Template/prompt family */
  family: LocalLLMModelFamily;
  /** Quantization level */
  quantization: string;
  /** Exact downloadable file size in bytes */
  sizeBytes: number;
  /** Display size string (e.g., "~535MB") */
  displaySize: string;
  /** Context window length */
  contextLength: number;
  /** What this model can do */
  capabilities: ModelCapability[];
  /** Which platforms can run this model */
  platform: ModelPlatform;
  /** Brief description */
  description?: string;
  /** Model license identifier shown before download */
  license?: string;
  /** 라이선스 성격 — permissive(Apache/MIT 등 허용적) 또는 custom(조건부 허용) */
  licenseKind: ModelLicenseKind;
  /** Base-model release month, displayed as YYYY.MM */
  releasedAt?: string;
  /** Whether the GGUF was published by the model owner or a converter */
  ggufSource?: GGUFSource;
  /** Original model repository when the downloadable GGUF is a conversion */
  sourceModelRepo?: string;
  /** Present only for models curated for the mobile picker */
  mobileProfile?: MobileModelProfile;
}

export const LOCAL_MODEL_REGISTRY: LocalModelDefinition[] = [
  // ── 2026 mobile catalog ─────────────────────────────────────────
  {
    id: "lfm2.5-2.6b-q4",
    name: "LFM2.5 2.6B",
    repo: "LiquidAI/LFM2.5-2.6B-GGUF",
    filename: "LFM2.5-2.6B-Q4_K_M.gguf",
    family: "lfm2",
    quantization: "Q4_K_M",
    sizeBytes: 1_674_455_040,
    displaySize: "~1.56GB",
    contextLength: 131_072,
    capabilities: ["chat", "tools", "reasoning"],
    platform: "both",
    description: "2026년 7월 공개된 휴대폰용 에이전트·RAG 균형형",
    license: "LFM 1.0",
    licenseKind: "custom",
    releasedAt: "2026.07",
    ggufSource: "publisher",
    mobileProfile: {
      rank: 1.5,
      tier: "balanced",
      strengths: ["한국어", "도구·추론"],
      caveat:
        "깊게 생각한 뒤 답해 첫 응답은 조금 느릴 수 있어요 · 커스텀 라이선스(LFM 1.0)라 상용 배포 시 라이선스 확인이 필요해요",
    },
  },
  {
    id: "kanana-2-3b-instruct-q4",
    name: "Kanana 2 3B Instruct",
    repo: "DKTechin/kanana",
    filename: "kanana-2-3b-instruct-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 2_161_793_408,
    displaySize: "~2.01GB",
    contextLength: 32_768,
    capabilities: ["chat", "tools", "reasoning"],
    platform: "both",
    description: "2026년 7월 공개된 카카오의 최신 한국어·영어 3B 모델",
    license: "Kanana Open License",
    licenseKind: "custom",
    releasedAt: "2026.07",
    ggufSource: "community",
    sourceModelRepo: "kakaocorp/kanana-2-3b-instruct",
    mobileProfile: {
      rank: 2,
      tier: "balanced",
      strengths: ["최신 모델", "한국어 특화", "대화·추론"],
      caveat: "커뮤니티 변환 GGUF이며 입력이 길면 발열이 늘 수 있어요",
    },
  },
  {
    id: "qwen3-edgerazor-1.7b-tq1",
    name: "Qwen3 EdgeRazor 1.7B 1.58-bit",
    repo: "zhangsq-nju/Qwen3-1.7B-EdgeRazor-GGUF",
    filename: "Qwen3-1.7B-EdgeRazor-TQ1_0.gguf",
    family: "embedded-chat",
    quantization: "TQ1_0 (1.58-bit QAT)",
    sizeBytes: 478_748_992,
    displaySize: "~457MB",
    contextLength: 40_960,
    capabilities: ["chat", "tools", "reasoning"],
    platform: "both",
    description:
      "Qwen3를 1.58-bit로 다시 학습해 크기를 크게 낮춘 2026년 엣지 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2026.04",
    ggufSource: "publisher",
    sourceModelRepo: "zhangsq-nju/Qwen3-1.7B-EdgeRazor-1.58bit",
    mobileProfile: {
      rank: 2.5,
      tier: "compact",
      strengths: ["1.58-bit QAT", "초경량", "Qwen3"],
      caveat:
        "TQ1 CPU 경로를 사용하므로 기기별 속도·출력 품질을 더 검증해야 해요",
      runtime: "llama-rn",
      experimental: true,
      lowBit: true,
      minRamGb: 3,
    },
  },
  {
    id: "minicpm5-1b-q4",
    name: "MiniCPM5 1B",
    repo: "openbmb/MiniCPM5-1B-GGUF",
    filename: "MiniCPM5-1B-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 688_065_920,
    displaySize: "~656MB",
    contextLength: 131_072,
    capabilities: ["chat", "tools", "reasoning"],
    platform: "both",
    description: "2026년 5월 공개된 온디바이스·엣지용 최신 1B 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2026.05",
    ggufSource: "publisher",
    mobileProfile: {
      rank: 3,
      tier: "compact",
      strengths: ["최신 모델", "빠른 응답", "도구 사용"],
      caveat: "영어·중국어 중심이라 한국어 품질은 큰 모델보다 낮을 수 있어요",
    },
  },
  {
    id: "qwen3-edgerazor-0.6b-tq1",
    name: "Qwen3 EdgeRazor 0.6B 1.58-bit",
    repo: "zhangsq-nju/Qwen3-0.6B-EdgeRazor-GGUF",
    filename: "Qwen3-0.6B-EdgeRazor-TQ1_0.gguf",
    family: "embedded-chat",
    quantization: "TQ1_0 (1.58-bit QAT)",
    sizeBytes: 186_626_304,
    displaySize: "~178MB",
    contextLength: 40_960,
    capabilities: ["chat", "tools", "reasoning"],
    platform: "both",
    description: "저사양 휴대폰에서도 시험하기 좋은 178MB Qwen3 1.58-bit 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2026.04",
    ggufSource: "publisher",
    sourceModelRepo: "zhangsq-nju/Qwen3-0.6B-EdgeRazor-1.58bit",
    mobileProfile: {
      rank: 3.5,
      tier: "compact",
      strengths: ["1.58-bit QAT", "178MB", "저사양 기기"],
      caveat:
        "매우 작아 복잡한 추론·한국어 품질은 큰 Q4 모델보다 낮을 수 있어요",
      runtime: "llama-rn",
      experimental: true,
      lowBit: true,
      minRamGb: 3,
    },
  },
  {
    id: "g9v3-3b-q4",
    name: "G9v3 3B",
    repo: "bartowski/ai9stars_G9v3-3B-GGUF",
    filename: "ai9stars_G9v3-3B-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 1_902_590_528,
    displaySize: "~1.77GB",
    contextLength: 131_072,
    capabilities: ["chat", "tools", "code", "reasoning"],
    platform: "both",
    description: "2026년 7월 공개된 로컬 대화·코딩·도구 사용 품질형",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2026.07",
    ggufSource: "community",
    sourceModelRepo: "ai9stars/G9v3-3B",
    mobileProfile: {
      rank: 4,
      tier: "quality",
      strengths: ["최신 모델", "코딩", "도구·추론"],
      caveat: "영어·중국어 중심이며 긴 추론은 배터리를 더 사용해요",
    },
  },
  {
    id: "nanbeige4.2-3b-q4",
    name: "Nanbeige 4.2 3B",
    repo: "bartowski/Nanbeige_Nanbeige4.2-3B-GGUF",
    filename: "Nanbeige_Nanbeige4.2-3B-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 2_684_023_968,
    displaySize: "~2.50GB",
    contextLength: 262_144,
    capabilities: ["chat", "tools", "code", "reasoning"],
    platform: "both",
    description: "2026년 7월 공개된 에이전트·코딩·장문 추론 3B 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2026.07",
    ggufSource: "community",
    sourceModelRepo: "Nanbeige/Nanbeige4.2-3B",
    mobileProfile: {
      rank: 5,
      tier: "quality",
      strengths: ["최신 모델", "에이전트", "코딩·추론"],
      caveat: "용량이 크고 영어·중국어 중심이라 한국어는 실험적으로 봐 주세요",
    },
  },
  {
    id: "kanana-2-1.3b-instruct-q8",
    name: "Kanana 2 1.3B Instruct",
    repo: "dummy9996/kanana-2-1.3b-instruct-GGUF",
    filename: "kanana-2-1.3b-instruct-Q8_0.gguf",
    family: "embedded-chat",
    quantization: "Q8_0",
    sizeBytes: 1_377_890_688,
    displaySize: "~1.28GB",
    contextLength: 32_768,
    capabilities: ["chat", "reasoning"],
    platform: "both",
    description: "2026년 7월 공개된 카카오의 최신 초경량 한국어 모델",
    license: "Kanana Open License",
    licenseKind: "custom",
    releasedAt: "2026.07",
    ggufSource: "community",
    sourceModelRepo: "kakaocorp/kanana-2-1.3b-instruct",
    mobileProfile: {
      rank: 6,
      tier: "compact",
      strengths: ["최신 모델", "한국어 특화", "작은 메모리"],
      caveat: "Q8 파일이라 같은 크기의 Q4 모델보다 저장 공간을 더 사용해요",
    },
  },
  {
    id: "qwen3.5-2b-q4",
    name: "Qwen 3.5 2B",
    repo: "unsloth/Qwen3.5-2B-GGUF",
    filename: "Qwen3.5-2B-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 1_280_835_840,
    displaySize: "~1.19GB",
    contextLength: 262_144,
    capabilities: ["chat", "tools", "reasoning"],
    platform: "both",
    description: "201개 언어를 지원하는 2026년 다국어 대화·추론 균형형",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2026.03",
    ggufSource: "community",
    sourceModelRepo: "Qwen/Qwen3.5-2B",
    mobileProfile: {
      rank: 1,
      tier: "balanced",
      recommended: true,
      strengths: ["기본 추천", "다국어", "한국어", "범용 추론"],
      caveat: "현재 앱에서는 텍스트 기능만 사용해요",
    },
  },
  {
    id: "lfm2.5-350m-q4",
    name: "LFM2.5 350M",
    repo: "LiquidAI/LFM2.5-350M-GGUF",
    filename: "LFM2.5-350M-Q4_K_M.gguf",
    family: "lfm2",
    quantization: "Q4_K_M",
    sizeBytes: 229_312_224,
    displaySize: "~219MB",
    contextLength: 32_768,
    capabilities: ["chat", "tools"],
    platform: "both",
    description: "2026년 공개 모델 중 가장 가벼운 태그·짧은 요약용",
    license: "LFM 1.0",
    licenseKind: "custom",
    releasedAt: "2026.03",
    ggufSource: "publisher",
    mobileProfile: {
      rank: 8,
      tier: "compact",
      strengths: ["초경량", "빠른 응답", "태그·요약"],
      caveat: "복잡한 질문이나 긴 대화의 정확도는 제한적이에요",
    },
  },
  {
    id: "qwen3.5-0.8b-q4",
    name: "Qwen 3.5 0.8B",
    repo: "unsloth/Qwen3.5-0.8B-GGUF",
    filename: "Qwen3.5-0.8B-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 532_517_120,
    displaySize: "~508MB",
    contextLength: 262_144,
    capabilities: ["chat", "tools", "reasoning"],
    platform: "both",
    description: "201개 언어와 긴 문맥을 지원하는 2026년 초경량 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2026.03",
    ggufSource: "community",
    sourceModelRepo: "Qwen/Qwen3.5-0.8B",
    mobileProfile: {
      rank: 9,
      tier: "compact",
      strengths: ["초경량", "한국어", "다국어"],
      caveat: "복잡한 추론보다 짧은 대화와 정리에 알맞아요",
    },
  },
  {
    id: "lfm2.5-1.2b-instruct-q4",
    name: "LFM2.5 1.2B Instruct",
    repo: "LiquidAI/LFM2.5-1.2B-Instruct-GGUF",
    filename: "LFM2.5-1.2B-Instruct-Q4_K_M.gguf",
    family: "lfm2",
    quantization: "Q4_K_M",
    sizeBytes: 730_895_168,
    displaySize: "~697MB",
    contextLength: 32_768,
    capabilities: ["chat", "tools"],
    platform: "both",
    description: "1GB 미만으로 빠른 요약·태그·가벼운 대화에 적합",
    license: "LFM 1.0",
    licenseKind: "custom",
    releasedAt: "2026.01",
    ggufSource: "publisher",
    mobileProfile: {
      rank: 10,
      tier: "compact",
      strengths: ["빠른 응답", "한국어", "요약·정리"],
      caveat: "지식 검색이나 복잡한 코딩에는 적합하지 않아요",
    },
  },
  {
    id: "qwen3.5-4b-q4",
    name: "Qwen 3.5 4B",
    repo: "unsloth/Qwen3.5-4B-GGUF",
    filename: "Qwen3.5-4B-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 2_740_937_888,
    displaySize: "~2.55GB",
    contextLength: 262_144,
    capabilities: ["chat", "tools", "reasoning"],
    platform: "both",
    description: "Qwen 3.5 소형군에서 답변 품질을 우선한 4B 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2026.03",
    ggufSource: "community",
    sourceModelRepo: "Qwen/Qwen3.5-4B",
    mobileProfile: {
      rank: 11,
      tier: "quality",
      strengths: ["한국어", "다국어", "높은 답변 품질"],
      caveat: "iPhone 15에서 긴 입력은 메모리·발열 부담이 커질 수 있어요",
    },
  },

  // ── Proven mobile and Korean-specialized models ────────────────
  {
    id: "ministral-3-3b-instruct-q4",
    name: "Ministral-3 3B Instruct",
    repo: "mistralai/Ministral-3-3B-Instruct-2512-GGUF",
    filename: "Ministral-3-3B-Instruct-2512-Q4_K_M.gguf",
    family: "mistral",
    quantization: "Q4_K_M",
    sizeBytes: 2_147_023_008,
    displaySize: "~2.00GB",
    contextLength: 262_144,
    capabilities: ["chat", "tools"],
    platform: "both",
    description: "한국어를 포함한 다국어 지시 이행을 중시한 품질형",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2025.12",
    ggufSource: "publisher",
    mobileProfile: {
      rank: 12,
      tier: "quality",
      strengths: ["응답 품질", "한국어", "긴 문서"],
      caveat: "용량이 크고 발열·배터리 사용량이 늘 수 있어요",
    },
  },
  {
    id: "ministral-3-3b-reasoning-q4",
    name: "Ministral-3 3B Reasoning",
    repo: "MaziyarPanahi/Ministral-3-3B-Reasoning-2512-GGUF",
    filename: "Ministral-3-3B-Reasoning-2512.Q4_K_M.gguf",
    family: "mistral",
    quantization: "Q4_K_M",
    sizeBytes: 2_146_496_704,
    displaySize: "~2.00GB",
    contextLength: 262_144,
    capabilities: ["chat", "reasoning"],
    platform: "both",
    description: "수학·논리 문제의 단계적 추론을 우선한 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2025.12",
    ggufSource: "community",
    sourceModelRepo: "mistralai/Ministral-3-3B-Reasoning-2512",
    mobileProfile: {
      rank: 13,
      tier: "quality",
      strengths: ["수학", "논리", "단계적 추론"],
      caveat: "일상 대화보다 문제 풀이에 맞고 답변 시작이 느릴 수 있어요",
    },
  },
  {
    id: "granite-4.0-micro-q4",
    name: "Granite 4.0 Micro",
    repo: "ibm-granite/granite-4.0-micro-GGUF",
    filename: "granite-4.0-micro-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 2_099_502_528,
    displaySize: "~1.96GB",
    contextLength: 131_072,
    capabilities: ["chat", "tools", "code", "reasoning"],
    platform: "both",
    description: "문서·RAG·도구 사용을 중시한 IBM의 3B 기업용 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2025.09",
    ggufSource: "publisher",
    mobileProfile: {
      rank: 14,
      tier: "quality",
      strengths: ["문서·RAG", "코딩", "도구 사용"],
      caveat: "일상 한국어 대화보다 구조화된 작업에 더 알맞아요",
    },
  },
  {
    id: "smallthinker-4b-a0.6b-q4",
    name: "SmallThinker 4B-A0.6B",
    repo: "Tiiny/SmallThinker-4BA0.6B-Instruct-GGUF",
    filename: "SmallThinker-4B-A0.6B-Instruct.Q4_K_S.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_S",
    sizeBytes: 2_491_948_128,
    displaySize: "~2.32GB",
    contextLength: 32_768,
    capabilities: ["chat", "tools", "code", "reasoning"],
    platform: "both",
    description: "0.6B만 활성화하는 온디바이스 전용 4B MoE 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2025.07",
    ggufSource: "publisher",
    mobileProfile: {
      rank: 15,
      tier: "quality",
      strengths: ["모바일 설계", "빠른 추론", "코딩"],
      caveat: "영어 중심이며 전체 4B 가중치 때문에 저장 공간은 작지 않아요",
    },
  },
  {
    id: "exaone-4.0-1.2b-q4",
    name: "EXAONE 4.0 1.2B",
    repo: "LGAI-EXAONE/EXAONE-4.0-1.2B-GGUF",
    filename: "EXAONE-4.0-1.2B-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 812_437_792,
    displaySize: "~775MB",
    contextLength: 65_536,
    capabilities: ["chat", "reasoning"],
    platform: "both",
    description: "LG AI Research의 작고 빠른 한국어·영어 추론 모델",
    license: "EXAONE AI Model License 1.1",
    licenseKind: "custom",
    releasedAt: "2025.07",
    ggufSource: "publisher",
    mobileProfile: {
      rank: 16,
      tier: "compact",
      strengths: ["한국어 특화", "빠른 응답", "추론"],
      caveat: "라이선스 조건을 확인하고 상업적 사용 여부를 결정해 주세요",
    },
  },
  {
    id: "hyperclovax-seed-1.5b-q4",
    name: "HyperCLOVA X SEED 1.5B",
    repo: "rippertnt/HyperCLOVAX-SEED-Text-Instruct-1.5B-Q4_K_M-GGUF",
    filename: "hyperclovax-seed-text-instruct-1.5b-q4_k_m.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 1_133_974_368,
    displaySize: "~1.06GB",
    contextLength: 131_072,
    capabilities: ["chat", "tools", "reasoning"],
    platform: "both",
    description: "네이버의 한국어 중심 장문·도구 사용 1.5B 모델",
    license: "HyperCLOVA X SEED License",
    licenseKind: "custom",
    releasedAt: "2025.04",
    ggufSource: "community",
    sourceModelRepo: "naver-hyperclovax/HyperCLOVAX-SEED-Text-Instruct-1.5B",
    mobileProfile: {
      rank: 17,
      tier: "compact",
      strengths: ["한국어 특화", "긴 문서", "도구 사용"],
      caveat: "커뮤니티 GGUF이며 최신 Kanana 2보다 오래된 모델이에요",
    },
  },

  // ── Mobile-first and high-memory edge models ───────────────────
  {
    id: "smollm3-3b-q4",
    name: "SmolLM3 3B",
    repo: "ggml-org/SmolLM3-3B-GGUF",
    filename: "SmolLM3-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 1_915_305_312,
    displaySize: "~1.78GB",
    contextLength: 65_536,
    capabilities: ["chat", "reasoning"],
    platform: "both",
    description:
      "작은 크기에서 긴 문맥과 선택형 추론을 제공하는 Hugging Face 3B 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2025.07",
    ggufSource: "community",
    sourceModelRepo: "HuggingFaceTB/SmolLM3-3B",
    mobileProfile: {
      rank: 18,
      tier: "balanced",
      strengths: ["긴 문맥", "추론 모드", "다국어"],
      caveat:
        "공식 지원 언어에 한국어가 명시되어 있지 않아 한국어는 실험적으로 봐 주세요",
      runtime: "llama-rn",
    },
  },
  {
    id: "gemma-3n-e2b-it-q4",
    name: "Gemma 3n E2B Instruct",
    repo: "unsloth/gemma-3n-E2B-it-GGUF",
    filename: "gemma-3n-E2B-it-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 3_026_881_888,
    displaySize: "~2.82GB",
    contextLength: 32_768,
    capabilities: ["chat", "reasoning"],
    platform: "both",
    description: "휴대폰·태블릿 실행을 목표로 설계된 Google의 모바일 우선 모델",
    license: "Gemma",
    licenseKind: "custom",
    releasedAt: "2025.06",
    ggufSource: "community",
    sourceModelRepo: "google/gemma-3n-E2B-it",
    mobileProfile: {
      rank: 19,
      tier: "quality",
      strengths: ["모바일 설계", "다국어", "답변 품질"],
      caveat: "현재 앱에서는 텍스트만 사용하며 8GB 이상 기기에 적합해요",
      runtime: "llama-rn",
      minRamGb: 8,
    },
  },
  {
    id: "lfm2.5-8b-a1b-q4",
    name: "LFM2.5 8B-A1B",
    repo: "LiquidAI/LFM2.5-8B-A1B-GGUF",
    filename: "LFM2.5-8B-A1B-Q4_0.gguf",
    family: "lfm2",
    quantization: "Q4_0",
    sizeBytes: 4_844_678_368,
    displaySize: "~4.51GB",
    contextLength: 131_072,
    capabilities: ["chat", "tools", "reasoning"],
    platform: "both",
    description: "8B 가중치 중 약 1B만 활성화하는 2026년 고성능 엣지 MoE 모델",
    license: "LFM 1.0",
    licenseKind: "custom",
    releasedAt: "2026.05",
    ggufSource: "publisher",
    mobileProfile: {
      rank: 20,
      tier: "quality",
      strengths: ["MoE 1B 활성", "한국어", "도구·추론"],
      caveat:
        "저장 공간과 전체 가중치 로딩 때문에 12GB 이상 RAM 기기를 권장해요",
      runtime: "llama-rn",
      minRamGb: 12,
    },
  },

  // ── Desktop-only medium ────────────────────────────────────────
  {
    id: "qwen3.5-9b-q4",
    name: "Qwen 3.5 9B",
    repo: "unsloth/Qwen3.5-9B-GGUF",
    filename: "Qwen3.5-9B-Q4_K_M.gguf",
    family: "embedded-chat",
    quantization: "Q4_K_M",
    sizeBytes: 5_680_522_464,
    displaySize: "~5.3GB",
    contextLength: 262_144,
    capabilities: ["chat", "tools", "vision", "reasoning"],
    platform: "both",
    description: "201개 언어와 높은 추론 품질을 제공하는 Qwen 3.5 고성능 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2026.03",
    ggufSource: "community",
    sourceModelRepo: "Qwen/Qwen3.5-9B",
    mobileProfile: {
      rank: 21,
      tier: "quality",
      strengths: ["한국어", "고품질 추론", "도구 사용"],
      caveat: "12GB 이상 RAM의 고성능 Android·태블릿에서만 권장해요",
      runtime: "llama-rn",
      minRamGb: 12,
    },
  },
  {
    id: "ministral-3-8b-instruct-q4",
    name: "Ministral-3 8B Instruct",
    repo: "unsloth/Ministral-3-8B-Instruct-2512-GGUF",
    filename: "Ministral-3-8B-Instruct-2512-Q4_K_M.gguf",
    family: "mistral",
    quantization: "Q4_K_M",
    sizeBytes: 5_197_434_880,
    displaySize: "~4.8GB",
    contextLength: 262_144,
    capabilities: ["chat", "tools", "code"],
    platform: "both",
    description: "에이전트·도구 사용·코딩을 중시한 Mistral의 고품질 소형 모델",
    license: "Apache-2.0",
    licenseKind: "permissive",
    releasedAt: "2025.12",
    ggufSource: "community",
    sourceModelRepo: "mistralai/Ministral-3-8B-Instruct-2512",
    mobileProfile: {
      rank: 22,
      tier: "quality",
      strengths: ["도구 사용", "코딩", "긴 문맥"],
      caveat: "12GB 이상 RAM 기기용이며 오래 실행하면 발열이 커질 수 있어요",
      runtime: "llama-rn",
      minRamGb: 12,
    },
  },
  {
    id: "ministral-3-14b-reasoning-q4",
    name: "Ministral-3 14B Reasoning",
    repo: "unsloth/Ministral-3-14B-Reasoning-2512-GGUF",
    filename: "Ministral-3-14B-Reasoning-2512-Q4_K_M.gguf",
    family: "mistral",
    quantization: "Q4_K_M",
    sizeBytes: 8_230_502_400,
    displaySize: "~7.7GB",
    contextLength: 262_144,
    capabilities: ["chat", "reasoning", "code"],
    platform: "desktop",
    description: "수학/코딩 추론 (2025.12)",
    license: "Apache-2.0",
    licenseKind: "permissive",
  },
  {
    id: "phi-4-reasoning-vision-15b-q4",
    name: "Phi-4 Reasoning Vision 15B",
    repo: "jamesburton/Phi-4-reasoning-vision-15B-GGUF",
    filename: "Phi-4-reasoning-vision-15B-Q4_K_M.gguf",
    family: "phi",
    quantization: "Q4_K_M",
    sizeBytes: 9_059_696_640,
    displaySize: "~8.4GB",
    contextLength: 16_384,
    capabilities: ["chat", "reasoning", "vision"],
    platform: "desktop",
    description: "이미지+텍스트 추론, SigLIP-2 (2026.01)",
    license: "MIT",
    licenseKind: "permissive",
  },
  {
    id: "magistral-small-2509-q4",
    name: "Magistral Small 24B",
    repo: "unsloth/Magistral-Small-2509-GGUF",
    filename: "Magistral-Small-2509-Q4_K_M.gguf",
    family: "mistral",
    quantization: "Q4_K_M",
    sizeBytes: 14_324_375_552,
    displaySize: "~13.4GB",
    contextLength: 131_072,
    capabilities: ["chat", "reasoning"],
    platform: "desktop",
    description: "[THINK] 토큰으로 긴 추론, 24B (2025.09)",
    license: "Apache-2.0",
    licenseKind: "permissive",
  },
  {
    id: "devstral-small-2-24b-q4",
    name: "Devstral Small 2 24B",
    repo: "unsloth/Devstral-Small-2-24B-Instruct-2512-GGUF",
    filename: "Devstral-Small-2-24B-Instruct-2512-Q4_K_M.gguf",
    family: "mistral",
    quantization: "Q4_K_M",
    sizeBytes: 14_324_375_552,
    displaySize: "~13.4GB",
    contextLength: 262_144,
    capabilities: ["chat", "code", "tools"],
    platform: "desktop",
    description: "에이전트 코딩, 함수호출 (2025.11)",
    license: "Apache-2.0",
    licenseKind: "permissive",
  },

  // ── Desktop-only large ─────────────────────────────────────────
  {
    id: "qwen3.5-27b-q4",
    name: "Qwen 3.5 27B",
    repo: "unsloth/Qwen3.5-27B-GGUF",
    filename: "Qwen3.5-27B-Q4_K_M.gguf",
    family: "qwen-chatml",
    quantization: "Q4_K_M",
    sizeBytes: 16_744_440_832,
    displaySize: "~15.6GB",
    contextLength: 262_144,
    capabilities: ["chat", "tools", "vision", "reasoning"],
    platform: "desktop",
    description: "대형 범용, 멀티모달 (2026.02)",
    license: "Apache-2.0",
    licenseKind: "permissive",
  },
  {
    id: "glm-4.7-flash-q4",
    name: "GLM-4.7 Flash",
    repo: "unsloth/GLM-4.7-Flash-GGUF",
    filename: "GLM-4.7-Flash-Q4_K_M.gguf",
    family: "glm",
    quantization: "Q4_K_M",
    sizeBytes: 18_307_849_216,
    displaySize: "~17GB",
    contextLength: 131_072,
    capabilities: ["chat", "tools", "reasoning"],
    platform: "desktop",
    description: "Zhipu AI, 한/영/중, 에이전트 (2026.01)",
    license: "MIT",
    licenseKind: "permissive",
  },
  {
    id: "qwen3.5-35b-a3b-q4",
    name: "Qwen 3.5 35B MoE",
    repo: "unsloth/Qwen3.5-35B-A3B-GGUF",
    filename: "Qwen3.5-35B-A3B-Q4_K_M.gguf",
    family: "qwen-chatml",
    quantization: "Q4_K_M",
    sizeBytes: 22_011_733_504,
    displaySize: "~20.5GB",
    contextLength: 262_144,
    capabilities: ["chat", "tools", "vision", "reasoning"],
    platform: "desktop",
    description: "MoE 3B 활성, 1M 확장, 최고 가성비 (2026.02)",
    license: "Apache-2.0",
    licenseKind: "permissive",
  },

  // ── Embedding ──────────────────────────────────────────────────
  {
    id: "nomic-embed-text-v1.5-q8_0",
    name: "Nomic Embed v1.5",
    repo: "nomic-ai/nomic-embed-text-v1.5-GGUF",
    filename: "nomic-embed-text-v1.5.Q8_0.gguf",
    family: "nomic",
    quantization: "Q8_0",
    sizeBytes: 327_155_712,
    displaySize: "~312MB",
    contextLength: 8_192,
    capabilities: ["embedding"],
    platform: "both",
    description: "텍스트 임베딩, 768차원",
    license: "Apache-2.0",
    licenseKind: "permissive",
    // 검색 재정렬용 온디바이스 임베딩 프로파일 — llama.rn 전용 컨텍스트
    mobileProfile: {
      rank: 90,
      tier: "compact",
      recommended: true,
      strengths: ["기기 내 임베딩", "검색 재정렬", "오프라인 동작"],
      caveat: "채팅이 아닌 검색 의미 재정렬 전용 모델입니다.",
      runtime: "llama-rn",
      minRamGb: 4,
    },
  },
  {
    id: "nomic-embed-text-v2-moe-q8_0",
    name: "Nomic Embed v2 MoE",
    repo: "nomic-ai/nomic-embed-text-v2-moe-GGUF",
    filename: "nomic-embed-text-v2-moe.Q8_0.gguf",
    family: "nomic",
    quantization: "Q8_0",
    sizeBytes: 293_601_280,
    displaySize: "~280MB",
    contextLength: 8_192,
    capabilities: ["embedding"],
    platform: "desktop",
    description: "MoE 임베딩, 효율적",
    license: "Apache-2.0",
    licenseKind: "permissive",
  },
];

export function getModelDefinition(
  modelId: string,
): LocalModelDefinition | undefined {
  return LOCAL_MODEL_REGISTRY.find((model) => model.id === modelId);
}

export function getChatModels(
  platform?: ModelPlatform,
): LocalModelDefinition[] {
  return LOCAL_MODEL_REGISTRY.filter(
    (model) =>
      model.capabilities.includes("chat") &&
      (!platform || model.platform === platform || model.platform === "both"),
  );
}

export function getEmbeddingModels(
  platform?: ModelPlatform,
): LocalModelDefinition[] {
  return LOCAL_MODEL_REGISTRY.filter(
    (model) =>
      model.capabilities.includes("embedding") &&
      (!platform || model.platform === platform || model.platform === "both"),
  );
}

export function getDesktopModels(): LocalModelDefinition[] {
  return LOCAL_MODEL_REGISTRY.filter(
    (model) => model.platform === "desktop" || model.platform === "both",
  );
}

export function getMobileModels(): LocalModelDefinition[] {
  return LOCAL_MODEL_REGISTRY.filter(
    (model) => model.platform === "mobile" || model.platform === "both",
  );
}
