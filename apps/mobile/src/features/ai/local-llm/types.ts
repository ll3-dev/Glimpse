import type { GenerateOptions, LoadModelOptions, StreamOptions } from '../llama-service';
import type { LocalLLMModelFamily } from '@glimpse/core/application/state';
import type { KnowledgeItem } from '@glimpse/shared';
export type { LocalLLMModelFamily };

export interface LocalLLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LocalLLMPreset {
  family: LocalLLMModelFamily;
  stopTokens: string[];
  defaults: GenerateOptions;
  loadOptions?: LoadModelOptions;
  buildChatPrompt: (
    messages: LocalLLMMessage[],
    contextItem?: KnowledgeItem | null
  ) => string;
  buildInstructionPrompt: (task: 'summary' | 'tags', instruction: string) => string;
  sanitizeOutput: (text: string) => string;
}

export type LocalLLMGenerateOptions = GenerateOptions;

export type LocalLLMStreamOptions = StreamOptions;
