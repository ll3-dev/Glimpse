/**
 * Public facade for llama.rn service types and factory.
 */

import { createLlamaService } from './llama-service.factory';

export type {
  GenerateOptions,
  GenerateResult,
  LoadModelOptions,
  LlamaService,
  StreamOptions,
} from './llama-service.types';
export { DEFAULT_STOP_TOKENS } from './llama-service.constants';
export { createLlamaService } from './llama-service.factory';

export const llamaService = createLlamaService();
