import type { LocalLLMModelFamily, LocalLLMPreset } from './types';
import {
  EMBEDDED_STOP_TOKENS,
  GENERIC_STOP_TOKENS,
  LFM_STOP_TOKENS,
  QWEN_STOP_TOKENS,
  buildChatMLInstructionPrompt,
  buildChatMLPrompt,
  buildContextSystemPrompt,
  buildConversationText,
  buildEmbeddedChatInput,
  buildGenericPrompt,
  buildLFMChatPrompt,
  buildLFMInstructionPrompt,
  buildMetadataSystemPrompt,
  sanitizeLFMOutput,
  sanitizeReasoningOutput,
  sanitizeWithMarkers,
} from './prompt-templates';
import { MODEL_PRESET_OVERRIDES } from './preset-overrides';

const genericPreset: LocalLLMPreset = {
  family: 'generic-instruct',
  stopTokens: GENERIC_STOP_TOKENS,
  defaults: {
    maxTokens: 256,
    temperature: 0.3,
    topP: 0.9,
  },
  loadOptions: {
    contextSize: 2048,
    gpuLayers: -1,
    useMlock: false,
    useMmap: true,
    flashAttention: false,
  },
  buildChatPrompt(messages, contextItem) {
    return buildGenericPrompt(buildContextSystemPrompt(contextItem), buildConversationText(messages));
  },
  buildInstructionPrompt(task, instruction) {
    return buildGenericPrompt(buildMetadataSystemPrompt(task), instruction);
  },
  sanitizeOutput(text) {
    return sanitizeWithMarkers(text, GENERIC_STOP_TOKENS);
  },
};

const embeddedChatPreset: LocalLLMPreset = {
  family: 'embedded-chat',
  stopTokens: EMBEDDED_STOP_TOKENS,
  defaults: {
    maxTokens: 512,
    temperature: 0.3,
    topP: 0.9,
  },
  loadOptions: {
    contextSize: 4096,
    gpuLayers: -1,
    useMlock: false,
    useMmap: true,
    flashAttention: true,
  },
  buildChatPrompt(messages, contextItem) {
    return buildEmbeddedChatInput(buildContextSystemPrompt(contextItem), messages);
  },
  buildInstructionPrompt(task, instruction) {
    return buildEmbeddedChatInput(
      buildMetadataSystemPrompt(task),
      [{ role: 'user', content: instruction }],
    );
  },
  sanitizeOutput: sanitizeReasoningOutput,
};

const qwenPreset: LocalLLMPreset = {
  family: "qwen-chatml",
  stopTokens: QWEN_STOP_TOKENS,
  defaults: {
    maxTokens: 512,
    temperature: 0.3,
    topP: 0.9,
  },
  loadOptions: {
    contextSize: 4096,
    gpuLayers: -1,
    useMlock: false,
    useMmap: true,
    flashAttention: true,
  },
  buildChatPrompt(messages, contextItem) {
    return buildChatMLPrompt(
      buildContextSystemPrompt(contextItem),
      messages,
    );
  },
  buildInstructionPrompt(task, instruction) {
    return buildChatMLInstructionPrompt(buildMetadataSystemPrompt(task), instruction);
  },
  sanitizeOutput(text) {
    // reasoning 모델(Qwen3) 대비 — 억제 지시(/no_think)가 안 먹힌
    // 케이스에서 <think> 블록이 답과 함께 오면 제거한다.
    const stripped = sanitizeReasoningOutput(text);
    return sanitizeWithMarkers(stripped, [
      ...QWEN_STOP_TOKENS,
      "<|im_start|>",
      "<|im_start|>user",
      "<|im_start|>assistant",
      "<|im_start|>system",
    ]);
  },
};

const lfmPreset: LocalLLMPreset = {
  family: 'lfm2',
  stopTokens: LFM_STOP_TOKENS,
  defaults: {
    maxTokens: 512,
    temperature: 0.1,
    topP: 0.95,
  },
  loadOptions: {
    contextSize: 4096,
    gpuLayers: -1,
    useMlock: false,
    useMmap: true,
    flashAttention: true,
  },
  buildChatPrompt(messages, contextItem) {
    return buildLFMChatPrompt(buildContextSystemPrompt(contextItem), messages);
  },
  buildInstructionPrompt(task, instruction) {
    return buildLFMInstructionPrompt(buildMetadataSystemPrompt(task), instruction);
  },
  sanitizeOutput: sanitizeLFMOutput,
};

const FAMILY_PRESETS: Record<LocalLLMModelFamily, LocalLLMPreset> = {
  'embedded-chat': embeddedChatPreset,
  'generic-instruct': genericPreset,
  'qwen-chatml': qwenPreset,
  lfm2: lfmPreset,
  llama: embeddedChatPreset,
  mistral: embeddedChatPreset,
  phi: embeddedChatPreset,
  qwen: qwenPreset,
  gemma: embeddedChatPreset,
  glm: embeddedChatPreset,
  nomic: genericPreset,
};

export function resolveLocalLLMPreset(
  model: { id: string; family?: LocalLLMModelFamily | null } | null | undefined
): LocalLLMPreset {
  const family = model?.family ?? 'generic-instruct';
  const basePreset = FAMILY_PRESETS[family] ?? genericPreset;
  const override = model ? MODEL_PRESET_OVERRIDES[model.id] : undefined;

  if (!override) {
    return basePreset;
  }

  return {
    ...basePreset,
    ...override,
    defaults: {
      ...basePreset.defaults,
      ...override.defaults,
    },
    stopTokens: override.stopTokens ?? basePreset.stopTokens,
    loadOptions: override.loadOptions
      ? { ...basePreset.loadOptions, ...override.loadOptions }
      : basePreset.loadOptions,
  };
}
