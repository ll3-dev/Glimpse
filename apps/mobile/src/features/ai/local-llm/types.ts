import type {
  GenerateOptions,
  LlamaPromptInput,
  LoadModelOptions,
  StreamOptions,
} from '../llama-service';
import type { LocalLLMModelFamily } from '@/src/features/core/application/state';
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
    contextItems?: KnowledgeItem[] | null
  ) => LlamaPromptInput;
  buildInstructionPrompt: (
    task: 'summary' | 'tags',
    instruction: string
  ) => LlamaPromptInput;
  sanitizeOutput: (text: string) => string;
}

export type LocalLLMGenerateOptions = GenerateOptions;

export type LocalLLMStreamOptions = StreamOptions;
