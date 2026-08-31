import type { KnowledgeItem } from '@glimpse/shared';
import type { LlamaPromptInput } from '../llama-service';
import { formatKnowledgeContext } from '../chat-context';
import type { LocalLLMMessage } from './types';

export const GENERIC_STOP_TOKENS = ['User:', 'System:', 'Assistant:', '</s>'];
export const QWEN_STOP_TOKENS = ['<|im_end|>', '<|endoftext|>', '</s>'];
export const LFM_STOP_TOKENS = ['<|im_end|>', '<|endoftext|>', '</s>'];
export const EMBEDDED_STOP_TOKENS = [
  '<|im_end|>',
  '<|im_start|>',
  '<|endoftext|>',
  '<|end_of_text|>',
  '[|endofturn|]',
  '</s>',
];

export function buildContextSystemPrompt(contextItems?: KnowledgeItem[] | null): string {
  const basePrompt = '당신은 도움이 되는 AI 어시스턴트입니다. 한국어로 친근하고 자연스럽게 대화해 주세요.';
  const knowledgeContext = formatKnowledgeContext(contextItems ?? []);
  return knowledgeContext ? `${basePrompt}\n\n${knowledgeContext}` : basePrompt;
}

export function buildMetadataSystemPrompt(task: 'summary' | 'tags'): string {
  return task === 'summary'
    ? 'You summarize content. Output only the requested summary with no preamble.'
    : 'You extract concise tags. Output only a comma-separated tag list with no preamble.';
}

export function buildGenericPrompt(systemPrompt: string, userPrompt: string): string {
  return `System:\n${systemPrompt}\n\nUser:\n${userPrompt}\n\nAssistant:\n`;
}

export function buildEmbeddedChatInput(
  systemPrompt: string,
  messages: LocalLLMMessage[],
): LlamaPromptInput {
  return {
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((message) => ({ role: message.role, content: message.content })),
    ],
    enableThinking: false,
  };
}

/**
 * Qwen3 등 reasoning 모델의 사고 블록 억제 — `/no_think`는 Qwen 채팅
 * 템플릿의 표준 스위치다. 사고에 생성 예산을 다 쓰면 최종 답이 빈
 * 문자열로 끊기므로(think 규칙상 제거되면 비게 된다) 시스템 슬롯에
 * 항상 억제 지시를 심는다.
 */
export const THINK_SUPPRESSION_SUFFIX =
  '\n\n질문에 곧바로 답변하세요. 사고 과정(/no_think)은 출력하지 마세요.';

export function buildChatMLPrompt(
  systemPrompt: string,
  messages: LocalLLMMessage[],
): string {
  let prompt = `<|im_start|>system\n${systemPrompt}${THINK_SUPPRESSION_SUFFIX}\n<|im_end|>\n`;
  for (const message of messages) {
    prompt += `<|im_start|>${message.role}\n${message.content}\n<|im_end|>\n`;
  }
  return `${prompt}<|im_start|>assistant\n`;
}

export function buildChatMLInstructionPrompt(
  systemPrompt: string,
  instruction: string,
): string {
  return `<|im_start|>system\n${systemPrompt}${THINK_SUPPRESSION_SUFFIX}\n<|im_end|>\n<|im_start|>user\n${instruction}\n<|im_end|>\n<|im_start|>assistant\n`;
}

export function buildLFMChatPrompt(
  systemPrompt: string,
  messages: LocalLLMMessage[],
  assistantPrefix = '',
): string {
  let prompt = `<|startoftext|><|im_start|>system\n${systemPrompt}<|im_end|>\n`;
  for (const message of messages) {
    prompt += `<|im_start|>${message.role}\n${message.content}<|im_end|>\n`;
  }
  return `${prompt}<|im_start|>assistant\n${assistantPrefix}`;
}

export function buildLFMInstructionPrompt(
  systemPrompt: string,
  instruction: string,
  assistantPrefix = '',
): string {
  return buildLFMChatPrompt(
    systemPrompt,
    [{ role: 'user', content: instruction }],
    assistantPrefix,
  );
}

export function buildConversationText(messages: LocalLLMMessage[]): string {
  return messages
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}:\n${message.content}`)
    .join('\n\n');
}

export function sanitizeWithMarkers(text: string, markers: string[]): string {
  let sanitized = text;
  for (const marker of markers) {
    const index = sanitized.indexOf(marker);
    if (index >= 0) sanitized = sanitized.slice(0, index);
  }
  return sanitized.trim();
}

export function sanitizeReasoningOutput(text: string): string {
  let sanitized = sanitizeWithMarkers(text, EMBEDDED_STOP_TOKENS);
  for (const [startMarker, endMarker] of [
    ['<think>', '</think>'],
    ['[THINK]', '[/THINK]'],
  ] as const) {
    const start = sanitized.indexOf(startMarker);
    if (start < 0) continue;
    const end = sanitized.indexOf(endMarker, start);
    if (end < 0) return sanitized.slice(0, start).trim();
    sanitized = `${sanitized.slice(0, start)}${sanitized.slice(end + endMarker.length)}`.trim();
  }
  return sanitized;
}

export function sanitizeLFMOutput(text: string): string {
  const withoutStopMarkers = sanitizeWithMarkers(text, LFM_STOP_TOKENS);
  const thinkStart = withoutStopMarkers.indexOf('<think>');
  if (thinkStart < 0) return withoutStopMarkers;
  const thinkEnd = withoutStopMarkers.indexOf('</think>', thinkStart);
  if (thinkEnd < 0) return '';
  return `${withoutStopMarkers.slice(0, thinkStart)}${withoutStopMarkers.slice(thinkEnd + 8)}`.trim();
}
