/**
 * Recommended model list for Local LLM
 *
 * Curated list of GGUF models that work well on mobile devices.
 * Model definitions are sourced from the shared @glimpse/shared registry.
 */

import type { LocalModelDefinition } from '@glimpse/shared';
import { getChatModels } from '@glimpse/shared';
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
  /** Exact size in bytes from the registry — download verification uses this */
  sizeBytes?: number;
  /** Model description */
  description?: string;
}

/**
 * Convert a LocalModelDefinition from the shared registry to the mobile ModelInfo shape.
 */
function toModelInfo(def: LocalModelDefinition): ModelInfo {
  return {
    id: def.id,
    name: def.name,
    repo: def.repo,
    filename: def.filename,
    family: def.family as LocalLLMModelFamily,
    size: def.displaySize,
    sizeBytes: def.sizeBytes,
    description: def.description,
  };
}

/**
 * Recommended models for mobile devices
 *
 * Selection criteria:
 * - Small enough to fit on device (under 4GB)
 * - Good performance/quality ratio
 * - Compatible with llama.rn
 */
export const RECOMMENDED_MODELS: ModelInfo[] = getChatModels('mobile').map(toModelInfo);

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
