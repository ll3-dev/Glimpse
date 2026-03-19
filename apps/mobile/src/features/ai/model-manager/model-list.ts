/**
 * Recommended model list for Local LLM
 *
 * Curated list of GGUF models that work well on mobile devices.
 */

import type { LocalLLMModelFamily } from '../local-llm';

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
  /** Prompt/template family */
  family: LocalLLMModelFamily;
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
    id: "qwen3.5-0.8b-unsloth-q4",
    name: "Qwen 3.5 0.8B Unsloth (Q4_K_M)",
    repo: "unsloth/Qwen3.5-0.8B-GGUF",
    filename: "Qwen3.5-0.8B-Q4_K_M.gguf",
    family: 'qwen-chatml',
    size: "~535MB",
    description: "가장 가벼운 Qwen 3.5",
  },
  {
    id: "qwen3.5-2b-unsloth-q4",
    name: "Qwen 3.5 2B Unsloth (Q4_K_M)",
    repo: "unsloth/Qwen3.5-2B-GGUF",
    filename: "Qwen3.5-2B-Q4_K_M.gguf",
    family: 'qwen-chatml',
    size: "~1.29GB",
    description: "속도와 성능의 균형",
  },
  {
    id: "qwen3.5-4b-unsloth-q4",
    name: "Qwen 3.5 4B Unsloth (Q4_K_M)",
    repo: "unsloth/Qwen3.5-4B-GGUF",
    filename: "Qwen3.5-4B-Q4_K_M.gguf",
    family: 'qwen-chatml',
    size: "~2.7GB",
    description: "Unsloth 최적화 버전",
  },
  {
    id: "gemma-3n-e2b-q3",
    name: "Gemma 3N E2B IT (Q3_K_M)",
    repo: "unsloth/gemma-3n-E2B-it-GGUF",
    filename: "gemma-3n-E2B-it-Q3_K_M.gguf",
    family: 'generic-instruct',
    size: "~2.3GB",
    description: "균형 잡힌 성능",
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
