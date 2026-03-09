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

      try {
        context = await initLlama(
          buildLoadOptions(modelPath, options),
          (progress) => options?.onProgress?.(Math.round(progress))
        );
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

    async generate(prompt, options) {
      const activeContext = requireContext();
      const startTime = Date.now();

      try {
        const result = await activeContext.completion(buildCompletionOptions(prompt, options));
        return toGenerateResult(result, startTime);
      } catch (error) {
        throw new Error(
          `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    async generateStream(prompt, options?: StreamOptions): Promise<GenerateResult> {
      const activeContext = requireContext();
      const startTime = Date.now();
      let fullText = '';

      try {
        const { promise, stop } = await activeContext.queueCompletion(
          buildCompletionOptions(prompt, options),
          (_requestId: number, data: { token: string }) => {
            if (!data?.token) {
              return;
            }

            fullText += data.token;
            options?.onToken?.(data.token);
          }
        );

        stopFn = stop;
        const result = await promise;
        stopFn = null;

        return toGenerateResult(result, startTime, fullText || result.text);
      } catch (error) {
        stopFn = null;
        throw new Error(
          `Streaming generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    async stopGeneration(): Promise<void> {
      if (!stopFn) {
        return;
      }

      try {
        await stopFn();
      } catch {
        // Ignore stop errors
      }

      stopFn = null;
    },

    async unloadModel(): Promise<void> {
      await releaseContext();
    },
  };
}
