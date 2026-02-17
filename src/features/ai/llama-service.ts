/**
 * Llama Service
 *
 * Wrapper for llama.rn SDK providing model lifecycle management
 * and text generation capabilities.
 *
 * @module llama-service
 */

import { initLlama, type LlamaContext } from 'llama.rn';

/**
 * Options for text generation
 */
export interface GenerateOptions {
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Sampling temperature (0-2, default: 0.7) */
  temperature?: number;
  /** Top-p (nucleus) sampling (0-1, default: 0.9) */
  topP?: number;
  /** Sequences where generation will stop */
  stopTokens?: string[];
}

/**
 * Result of text generation
 */
export interface GenerateResult {
  /** Generated text content */
  text: string;
  /** Number of tokens generated */
  tokensGenerated: number;
  /** Time taken for generation in ms */
  timingMs: number;
}

/**
 * Model loading options
 */
export interface LoadModelOptions {
  /** Context window size (default: 2048) */
  contextSize?: number;
  /** Number of layers to offload to GPU (default: 0) */
  gpuLayers?: number;
  /** Use memory lock for better performance */
  useMlock?: boolean;
}

/**
 * Llama Service Interface
 *
 * Defines the contract for llama model lifecycle and generation.
 */
export interface LlamaService {
  /**
   * Load a model from the given path
   * @param modelPath - Path to the GGUF model file
   * @param options - Optional loading configuration
   */
  loadModel(modelPath: string, options?: LoadModelOptions): Promise<void>;

  /**
   * Check if a model is currently loaded
   */
  isModelLoaded(): boolean;

  /**
   * Generate text from a prompt
   * @param prompt - The input prompt
   * @param options - Generation options
   */
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;

  /**
   * Unload the current model and release resources
   */
  unloadModel(): Promise<void>;
}

/**
 * Default stop tokens for common models
 */
const DEFAULT_STOP_TOKENS = [
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|END_OF_TURN_TOKEN|>',
  '<|end_of_turn|>',
  '</s>',
];

/**
 * Create a llama service instance
 *
 * This factory function returns a service implementation
 * that wraps the llama.rn SDK.
 */
export function createLlamaService(): LlamaService {
  // State
  let context: LlamaContext | null = null;

  return {
    async loadModel(modelPath: string, options?: LoadModelOptions): Promise<void> {
      // Validate path
      if (!modelPath || typeof modelPath !== 'string') {
        throw new Error('Model path is required and must be a string');
      }

      // Validate path format (should be a file URL or absolute path)
      if (!modelPath.startsWith('file://') && !modelPath.startsWith('/')) {
        throw new Error(
          'Model path must be an absolute path or file:// URL. ' +
            `Received: ${modelPath.slice(0, 50)}...`
        );
      }

      // Release existing context if any
      if (context) {
        try {
          await context.release();
        } catch {
          // Ignore release errors
        }
        context = null;
      }

      try {
        // Initialize llama context with the model
        context = await initLlama({
          model: modelPath,
          use_mlock: options?.useMlock ?? true,
          n_ctx: options?.contextSize ?? 2048,
          n_gpu_layers: options?.gpuLayers ?? 0,
        });
      } catch (error) {
        context = null;
        throw new Error(
          `Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    isModelLoaded(): boolean {
      return context !== null;
    },

    async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
      if (!context) {
        throw new Error('No model loaded. Call loadModel() first.');
      }

      const startTime = Date.now();

      try {
        const result = await context.completion({
          prompt,
          n_predict: options?.maxTokens ?? 256,
          temperature: options?.temperature ?? 0.7,
          top_p: options?.topP ?? 0.9,
          stop: options?.stopTokens ?? DEFAULT_STOP_TOKENS,
        });

        return {
          text: result.text,
          tokensGenerated: result.tokens_evaluated ?? 0,
          timingMs: Date.now() - startTime,
        };
      } catch (error) {
        throw new Error(
          `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    async unloadModel(): Promise<void> {
      if (context) {
        try {
          await context.release();
        } catch {
          // Ignore release errors
        }
        context = null;
      }
    },
  };
}

/**
 * Default llama service instance
 */
export const llamaService = createLlamaService();
