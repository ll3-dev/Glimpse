import { initLlama, type LlamaContext } from 'llama.rn';
import type {
  GenerateResult,
  LlamaService,
  LoadModelOptions,
  StreamOptions,
} from './llama-service.types';
import {
  buildCompletionOptions,
  buildLoadOptions,
  toGenerateResult,
  validateModelPath,
} from './llama-service.utils';
import { logger } from '@/src/utils/logger';

type QueueCompletionContext = LlamaContext & {
  queueCompletion?: (
    params: ReturnType<typeof buildCompletionOptions>,
    onToken?: (requestId: number, data: { token?: string }) => void
  ) => Promise<{
    promise: Promise<{ text: string; tokens_evaluated?: number }>;
    stop: () => Promise<void>;
  }>;
  parallel?: {
    completion?: (
      params: ReturnType<typeof buildCompletionOptions>,
      onToken?: (requestId: number, data: { token?: string }) => void
    ) => Promise<{
      promise: Promise<{ text: string; tokens_evaluated?: number }>;
      stop: () => Promise<void>;
    }>;
  };
};

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.length > 0) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      message?: unknown;
      error?: unknown;
      code?: unknown;
      nativeStackIOS?: unknown;
    };

    if (typeof candidate.message === 'string' && candidate.message.length > 0) {
      return candidate.message;
    }

    if (typeof candidate.error === 'string' && candidate.error.length > 0) {
      return candidate.error;
    }

    if (typeof candidate.code === 'string' && candidate.code.length > 0) {
      return `code=${candidate.code}`;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

function isParallelModeDisabledError(error: unknown): boolean {
  return extractErrorMessage(error).includes('Parallel mode not enabled');
}

export function createLlamaService(): LlamaService {
  let context: LlamaContext | null = null;
  let stopFn: (() => Promise<void>) | null = null;

  async function releaseContext(): Promise<void> {
    if (!context) {
      return;
    }

    try {
      await context.release();
    } catch {
      // Ignore release errors
    }

    context = null;
  }

  function requireContext(): LlamaContext {
    if (!context) {
      throw new Error('No model loaded. Call loadModel() first.');
    }

    return context;
  }

  return {
    async loadModel(modelPath: string, options?: LoadModelOptions): Promise<void> {
      validateModelPath(modelPath);
      await releaseContext();

      const baseOptions = buildLoadOptions(modelPath, options);
      const attemptedErrors: string[] = [];
      const candidates = buildLoadCandidates(baseOptions);

      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];

        try {
          context = await initLlama(candidate, (progress) => options?.onProgress?.(Math.round(progress)));
          return;
        } catch (error) {
          const message = extractErrorMessage(error);
          attemptedErrors.push(`ctx=${candidate.n_ctx}, mlock=${candidate.use_mlock}: ${message}`);

          logger.error(index === 0 ? 'llama.rn loadModel failed' : 'llama.rn loadModel retry failed', error, {
            modelPath,
            useMlock: candidate.use_mlock,
            contextSize: candidate.n_ctx,
            gpuLayers: candidate.n_gpu_layers,
          });

          const nextCandidate = candidates[index + 1];
          if (nextCandidate) {
            logger.warn('Retrying llama.rn loadModel with fallback options', {
              modelPath,
              previousError: message,
              nextUseMlock: nextCandidate.use_mlock,
              nextContextSize: nextCandidate.n_ctx,
            });
          }
        }
      }

      context = null;
      throw new Error(`Failed to load model: ${attemptedErrors.join(' | ')}`);
    },

    isModelLoaded(): boolean {
      return context !== null;
    },

    async generate(prompt, options) {
      const activeContext = requireContext();
      const startTime = Date.now();

      try {
        const result = await activeContext.completion(buildCompletionOptions(prompt, options));
        return toGenerateResult(result, startTime);
      } catch (error) {
        logger.error('llama.rn completion failed', error, { promptLength: prompt.length });
        throw new Error(`Generation failed: ${extractErrorMessage(error)}`);
      }
    },

    async generateStream(prompt, options?: StreamOptions): Promise<GenerateResult> {
      const activeContext = requireContext();
      const streamingContext = activeContext as QueueCompletionContext;
      const startTime = Date.now();
      let fullText = '';
      const completionOptions = buildCompletionOptions(prompt, options);

      try {
        const handleToken = (_requestId: number, data: { token?: string }) => {
          if (!data?.token) {
            return;
          }

          fullText += data.token;
          options?.onToken?.(data.token);
        };

        if (typeof streamingContext.parallel?.completion === 'function') {
          try {
            const { promise, stop } = await streamingContext.parallel.completion(
              completionOptions,
              handleToken
            );

            stopFn = stop;
            const result = await promise;
            stopFn = null;

            return toGenerateResult(result, startTime, fullText || result.text);
          } catch (error) {
            if (!isParallelModeDisabledError(error)) {
              throw error;
            }

            logger.warn('llama.rn parallel completion unavailable, falling back to completion()', {
              reason: extractErrorMessage(error),
            });
          }
        }

        if (typeof streamingContext.queueCompletion === 'function') {
          const { promise, stop } = await streamingContext.queueCompletion(
            completionOptions,
            handleToken
          );

          stopFn = stop;
          const result = await promise;
          stopFn = null;

          return toGenerateResult(result, startTime, fullText || result.text);
        }

        stopFn = async () => {
          await activeContext.stopCompletion();
        };
        const result = await activeContext.completion(completionOptions, (data: { token?: string }) => {
          if (!data?.token) {
            return;
          }

          fullText += data.token;
          options?.onToken?.(data.token);
        });
        stopFn = null;

        return toGenerateResult(result, startTime, fullText || result.text);
      } catch (error) {
        stopFn = null;
        logger.error('llama.rn streaming completion failed', error, {
          promptLength: prompt.length,
          tokenCount: fullText.length,
        });
        throw new Error(`Streaming generation failed: ${extractErrorMessage(error)}`);
      }
    },

    async stopGeneration(): Promise<void> {
      try {
        if (stopFn) {
          await stopFn();
          stopFn = null;
          return;
        }

        if (context) {
          await context.stopCompletion();
        }
      } catch {
        // Ignore stop errors
      }
    },

    async unloadModel(): Promise<void> {
      await releaseContext();
    },
  };
}

function buildLoadCandidates(baseOptions: ReturnType<typeof buildLoadOptions>) {
  const candidates: ReturnType<typeof buildLoadOptions>[] = [];
  const seen = new Set<string>();
  const contextSizes = Array.from(new Set([baseOptions.n_ctx, 2048, 1024])).filter(
    (value): value is number => typeof value === 'number' && value > 0 && value <= baseOptions.n_ctx
  );

  for (const contextSize of contextSizes) {
    for (const useMlock of [baseOptions.use_mlock, false]) {
      const candidate = {
        ...baseOptions,
        n_ctx: contextSize,
        use_mlock: useMlock,
      };
      const key = `${candidate.n_ctx}:${candidate.use_mlock}:${candidate.n_gpu_layers}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      candidates.push(candidate);
    }
  }

  return candidates;
}
