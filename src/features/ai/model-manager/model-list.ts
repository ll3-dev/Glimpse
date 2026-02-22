/**
 * Recommended model list for Local LLM
 *
 * Curated list of GGUF models that work well on mobile devices.
 */

/**
 * Model metadata for download and display
 */
export interface ModelInfo {
  /** Unique model identifier */
  id: string;
  /** Display name */
  name: string;
  /** HuggingFace repository (e.g., "Qwen/Qwen2.5-1.5B-Instruct-GGUF") */
  repo: string;
  /** GGUF filename in the repository */
  filename: string;
  /** Display size (e.g., "~1GB") */
  size?: string;
  /** Model description */
  description?: string;
}

/**
 * Recommended models for mobile devices
 *
 * Selection criteria:
 * - Small enough to fit on device (under 4GB)
 * - Good performance/quality ratio
 * - Compatible with llama.rn
 */
export const RECOMMENDED_MODELS: ModelInfo[] = [
  {
    id: 'qwen2.5-1.5b-q4',
    name: 'Qwen 2.5 1.5B (Q4_K_M)',
    repo: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
    filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    size: '~1GB',
    description: '빠르고 가벼운 모델',
  },
  {
    id: 'gemma-3n-e2b-q3',
    name: 'Gemma 3N E2B IT (Q3_K_M)',
    repo: 'unsloth/gemma-3n-E2B-it-GGUF',
    filename: 'gemma-3n-E2B-it-Q3_K_M.gguf',
    size: '~2.3GB',
    description: '균형 잡힌 성능',
  },
  {
    id: 'phi-4-mini-q4',
    name: 'Phi-4 Mini (Q4_K_M)',
    repo: 'microsoft/Phi-4-mini-instruct-GGUF',
    filename: 'Phi-4-mini-instruct-Q4_K_M.gguf',
    size: '~2.5GB',
    description: 'Microsoft의 효율적인 소형 모델',
  },
  {
    id: 'llama-3.2-1b-q4',
    name: 'Llama 3.2 1B (Q4_K_M)',
    repo: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    size: '~0.8GB',
    description: 'Meta의 가장 작은 Llama 모델',
  },
];

/**
 * Get a model by its ID
 */
export function getModelById(modelId: string): ModelInfo | undefined {
  return RECOMMENDED_MODELS.find((m) => m.id === modelId);
}

/**
 * Check if a model ID is in the recommended list
 */
export function isRecommendedModel(modelId: string): boolean {
  return RECOMMENDED_MODELS.some((m) => m.id === modelId);
}
