/**
 * Recommended model list for Local LLM
 *
 * Curated list of GGUF models that work well on mobile devices.
 * Model definitions are sourced from the shared @glimpse/shared registry.
 */

import type {
  GGUFSource,
  LocalModelDefinition,
  MobileModelProfile,
} from "@glimpse/shared";
import { getChatModels } from "@glimpse/shared";
import type { LocalLLMModelFamily } from "../local-llm";

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
  /** Quantization used by the downloadable artifact */
  quantization: string;
  /** Publisher/model-card maximum context; runtime may intentionally use less. */
  contextLength: number;
  /** License identifier from the publisher/model card */
  license?: string;
  /** Base-model release month shown in the catalog */
  releasedAt?: string;
  /** Whether the downloadable GGUF came from the model publisher */
  ggufSource?: GGUFSource;
  /** Original model repository for community conversions */
  sourceModelRepo?: string;
  /** Device-oriented recommendation metadata */
  mobileProfile: MobileModelProfile;
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
    quantization: def.quantization,
    contextLength: def.contextLength,
    license: def.license,
    releasedAt: def.releasedAt,
    ggufSource: def.ggufSource,
    sourceModelRepo: def.sourceModelRepo,
    mobileProfile: def.mobileProfile!,
  };
}

/**
 * Recommended models for mobile devices
 *
 * Selection criteria:
 * - Mobile or high-memory edge hardware is an intended target
 * - Compatible with llama.rn 0.12.x model architectures
 * - Public, single-file GGUF download
 *
 * Per-device RAM cutoffs are applied by device-compatibility.ts instead of
 * excluding larger models from this source catalog.
 */
export const RECOMMENDED_MODELS: ModelInfo[] = getChatModels("mobile")
  .filter((model) => model.mobileProfile)
  .sort((a, b) => a.mobileProfile!.rank - b.mobileProfile!.rank)
  .map(toModelInfo);

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
