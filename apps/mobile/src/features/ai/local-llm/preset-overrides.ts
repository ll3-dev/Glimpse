import type { LocalLLMPreset } from './types';
import {
  buildContextSystemPrompt,
  buildLFMChatPrompt,
  buildLFMInstructionPrompt,
  buildMetadataSystemPrompt,
} from './prompt-templates';

export const MODEL_PRESET_OVERRIDES: Partial<
  Record<string, Partial<LocalLLMPreset>>
> = {
  'lfm2.5-2.6b-q4': {
    defaults: {
      maxTokens: 768,
      temperature: 0.1,
      topP: 0.95,
    },
    buildChatPrompt(messages, contextItems) {
      return buildLFMChatPrompt(
        buildContextSystemPrompt(contextItems),
        messages,
        '<think>\n',
      );
    },
    buildInstructionPrompt(task, instruction) {
      return buildLFMInstructionPrompt(
        buildMetadataSystemPrompt(task),
        instruction,
        '<think>\n',
      );
    },
  },
  'qwen3.5-4b-q4': {
    defaults: {
      maxTokens: 384,
      temperature: 0.2,
      topP: 0.85,
    },
  },
  'qwen3.5-4b-unsloth-q4': {
    defaults: {
      maxTokens: 384,
      temperature: 0.2,
      topP: 0.85,
    },
  },
};
