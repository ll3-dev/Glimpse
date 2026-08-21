import type { LlamaService } from './llama-service.types';

const WEB_UNSUPPORTED_MESSAGE = 'Local LLM is only available in the native Glimpse app.';

/**
 * Web/SSR-safe local LLM adapter.
 *
 * `llama.rn` reads native TurboModules during import, so it must never enter a
 * web server bundle. The public contract remains available and fails
 * explicitly only when a native-only operation is requested.
 */
export function createLlamaService(): LlamaService {
  return {
    async loadModel() {
      throw new Error(WEB_UNSUPPORTED_MESSAGE);
    },
    isModelLoaded() {
      return false;
    },
    async generate() {
      throw new Error(WEB_UNSUPPORTED_MESSAGE);
    },
    async generateStream() {
      throw new Error(WEB_UNSUPPORTED_MESSAGE);
    },
    async stopGeneration() {},
    async unloadModel() {},
  };
}
