/**
 * Public facade for llama.rn service types and factory.
 */

import { createLlamaService } from './llama-service.factory';

export type {
  GenerateOptions,
  GenerateResult,
  LlamaChatMessage,
  LlamaPromptInput,
  LoadModelOptions,
  LlamaService,
  StreamOptions,
} from './llama-service.types';
export { DEFAULT_STOP_TOKENS } from './llama-service.constants';
export { createLlamaService } from './llama-service.factory';
export {
  STREAM_TOKEN_EVENT,
  STREAM_DONE_EVENT,
  subscribeStreamEvent,
  subscribeStreamToken,
  subscribeStreamDone,
  emitStreamToken,
  emitStreamDone,
} from './stream-events';
export type { StreamTokenPayload, StreamDonePayload } from './stream-events';

export const llamaService = createLlamaService();
