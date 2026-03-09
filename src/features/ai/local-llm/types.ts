import type { GenerateOptions, StreamOptions } from '../llama-service';
import type { KnowledgeItem } from '@/src/db';

export type LocalLLMModelFamily = 'generic-instruct' | 'qwen-chatml';

export interface LocalLLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LocalLLMPreset {
  family: LocalLLMModelFamily;
  stopTokens: string[];
  defaults: GenerateOptions;
  buildChatPrompt: (
    messages: LocalLLMMessage[],
    contextItem?: KnowledgeItem | null
  ) => string;
  buildInstructionPrompt: (task: 'summary' | 'tags', instruction: string) => string;
  sanitizeOutput: (text: string) => string;
}

export type LocalLLMGenerateOptions = GenerateOptions;

export type LocalLLMStreamOptions = StreamOptions;
