import type { KnowledgeItem } from '@glimpse/shared';
import type {
  LocalLLMMessage,
  LocalLLMModelFamily,
  LocalLLMPreset,
} from './types';

function buildContextSystemPrompt(contextItem?: KnowledgeItem | null): string {
  const basePrompt = '당신은 도움이 되는 AI 어시스턴트입니다. 한국어로 친근하고 자연스럽게 대화해 주세요.';

  if (!contextItem) {
    return basePrompt;
  }

  const contextInfo: string[] = [];
  if (contextItem.title) {
    contextInfo.push(`제목: ${contextItem.title}`);
  }
  if (contextItem.body) {
    contextInfo.push(`내용: ${contextItem.body}`);
  }
  if (contextItem.url) {
    contextInfo.push(`URL: ${contextItem.url}`);
  }
  if (contextItem.summary) {
    contextInfo.push(`요약: ${contextItem.summary}`);
  }
  if (contextItem.tags && contextItem.tags.length > 0) {
    contextInfo.push(`태그: ${contextItem.tags.join(', ')}`);
  }

  if (contextInfo.length === 0) {
    return basePrompt;
  }

  return `${basePrompt}

사용자가 다음 항목에 대해 질문하고 있습니다:
${contextInfo.join('\n')}

이 컨텍스트를 바탕으로 질문에 답변해 주세요.`;
}

function buildMetadataSystemPrompt(task: 'summary' | 'tags'): string {
  if (task === 'summary') {
    return 'You summarize content. Output only the requested summary with no preamble.';
  }

  return 'You extract concise tags. Output only a comma-separated tag list with no preamble.';
}

function buildGenericPrompt(systemPrompt: string, userPrompt: string): string {
  return `System:
${systemPrompt}

User:
${userPrompt}

Assistant:
`;
}

function buildChatMLPrompt(systemPrompt: string, userPrompt: string): string {
  return `<|im_start|>system
${systemPrompt}
<|im_end|>
<|im_start|>user
${userPrompt}
<|im_end|>
<|im_start|>assistant
`;
}

function buildConversationText(messages: LocalLLMMessage[]): string {
  return messages
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}:\n${message.content}`)
    .join('\n\n');
}

function sanitizeWithMarkers(text: string, markers: string[]): string {
  let sanitized = text;

  for (const marker of markers) {
    const index = sanitized.indexOf(marker);
    if (index >= 0) {
      sanitized = sanitized.slice(0, index);
    }
  }

  return sanitized.trim();
}

const GENERIC_STOP_TOKENS = ['User:', 'System:', 'Assistant:', '</s>'];
const QWEN_STOP_TOKENS = ['<|im_end|>', '<|endoftext|>', '</s>'];

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
    gpuLayers: 0,
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

const qwenPreset: LocalLLMPreset = {
  family: "qwen-chatml",
  stopTokens: QWEN_STOP_TOKENS,
  defaults: {
    maxTokens: 32_768,
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
      buildConversationText(messages),
    );
  },
  buildInstructionPrompt(task, instruction) {
    return buildChatMLPrompt(buildMetadataSystemPrompt(task), instruction);
  },
  sanitizeOutput(text) {
    return sanitizeWithMarkers(text, [
      ...QWEN_STOP_TOKENS,
      "<|im_start|>",
      "<|im_start|>user",
      "<|im_start|>assistant",
      "<|im_start|>system",
    ]);
  },
};

const FAMILY_PRESETS: Record<LocalLLMModelFamily, LocalLLMPreset> = {
  'generic-instruct': genericPreset,
  'qwen-chatml': qwenPreset,
};

const MODEL_OVERRIDES: Partial<Record<string, Partial<LocalLLMPreset>>> = {
  'qwen3.5-4b-unsloth-q4': {
    defaults: {
      maxTokens: 384,
      temperature: 0.2,
      topP: 0.85,
    },
  },
};

export function resolveLocalLLMPreset(
  model: { id: string; family?: LocalLLMModelFamily | null } | null | undefined
): LocalLLMPreset {
  const family = model?.family ?? 'generic-instruct';
  const basePreset = FAMILY_PRESETS[family] ?? genericPreset;
  const override = model ? MODEL_OVERRIDES[model.id] : undefined;

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
