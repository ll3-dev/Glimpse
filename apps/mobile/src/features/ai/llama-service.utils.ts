import { DEFAULT_STOP_TOKENS } from './llama-service.constants';
import type { GenerateOptions, GenerateResult, LoadModelOptions } from './llama-service.types';

export function validateModelPath(modelPath: string): void {
  if (!modelPath || typeof modelPath !== 'string') {
    throw new Error('Model path is required and must be a string');
  }

  if (!modelPath.startsWith('file://') && !modelPath.startsWith('/')) {
    throw new Error(
      'Model path must be an absolute path or file:// URL. ' +
        `Received: ${modelPath.slice(0, 50)}...`
    );
  }
}

export function buildLoadOptions(modelPath: string, options?: LoadModelOptions) {
  return {
    model: modelPath,
    use_mlock: options?.useMlock ?? false,
    use_mmap: options?.useMmap ?? true,
    n_ctx: options?.contextSize ?? 2048,
    n_gpu_layers: options?.gpuLayers ?? 0,
    flash_attn_type: options?.flashAttention ? ('on' as const) : undefined,
    n_threads: options?.threads,
  };
}

export function buildCompletionOptions(prompt: string, options?: GenerateOptions) {
  return {
    prompt,
    n_predict: options?.maxTokens ?? 256,
    temperature: options?.temperature ?? 0.7,
    top_p: options?.topP ?? 0.9,
    stop: options?.stopTokens ?? DEFAULT_STOP_TOKENS,
  };
}

export function toGenerateResult(
  result: { text: string; tokens_evaluated?: number },
  startTime: number,
  textOverride?: string
): GenerateResult {
  return {
    text: textOverride ?? result.text,
    tokensGenerated: result.tokens_evaluated ?? 0,
    timingMs: Date.now() - startTime,
  };
}
