import type { KnowledgeItem, KnowledgeItemLabelSource } from '@glimpse/shared';
import { Effect } from "effect";
import {
  appError,
  isFailure,
  type Result,
  type AppError,
  runEffectResult,
} from "@/src/lib/effect-result";
import { appleProvider } from '../providers/apple-provider';
import { byokProvider } from '../providers/byok-provider';
import { localLLMProvider } from '../providers/local-llm-provider';
import { stubProvider } from '../metadata/stub-provider';
import { deriveRuleBasedLabels, RULE_BASED_LABELER_VERSION } from '@/src/features/labeling/rule-based-labeler';
import { LABEL_TAXONOMY, type LabelingResult } from '@/src/features/labeling/types';
import { getSelectedLocalModel } from '@/src/features/settings/local-llm.selectors';
import { getLocalLLMRuntime } from '@/src/hooks/chat/chatRuntime';
import { getApiKey, getBaseUrl, getModel, getProvider } from '@/src/features/settings/byok.selectors';
import type { AITarget } from './types';

export interface MetadataExecutionInput {
  content: string;
  title?: string;
  type?: 'note' | 'link' | 'highlight' | 'screenshot' | 'share';
}

export interface ChatExecutionInput {
  userText: string;
  contextItem?: KnowledgeItem | null;
}

function executionError<T>(message: string, target: AITarget): Result<T> {
  return {
    success: false as const,
    error: appError('GENERATION_ERROR', message, { target }),
  };
}

export async function executeMetadataTarget(
  target: AITarget,
  input: MetadataExecutionInput
): Promise<Result<{ summary: string; tags: string[] }>> {
  switch (target.kind) {
    case 'apple':
      return runEffectResult(appleProvider.generate(input));
    case 'local':
      return runEffectResult(localLLMProvider.generate(input));
    case 'byok':
      return runEffectResult(byokProvider.generate(input));
    case 'stub':
      return runEffectResult(stubProvider.generate(input));
    case 'rules':
      return executionError('Rules target does not support metadata generation', target);
  }
}

function mapTargetToLabelSource(target: AITarget): KnowledgeItemLabelSource {
  switch (target.kind) {
    case 'rules':
      return 'rules';
    case 'apple':
      return 'apple';
    case 'local':
      return 'local_full';
    case 'byok':
      return 'byok';
    case 'stub':
      return 'stub';
  }
}

function normalizeLabels(tags: string[], item: KnowledgeItem): typeof LABEL_TAXONOMY[number][] {
  const normalized = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag): tag is typeof LABEL_TAXONOMY[number] =>
      LABEL_TAXONOMY.includes(tag as (typeof LABEL_TAXONOMY)[number])
    );

  if (normalized.length > 0) {
    return [...new Set(normalized)].slice(0, 3);
  }

  return [item.type === 'link' ? 'reference' : 'personal'];
}

export async function executeLabelingTarget(
  target: AITarget,
  item: KnowledgeItem
): Promise<Result<LabelingResult>> {
  if (target.kind === 'rules') {
    return {
      success: true,
      data: deriveRuleBasedLabels(item),
    };
  }

  const metadataResult = await executeMetadataTarget(target, {
    content: [item.title, item.body, item.summary].filter(Boolean).join('\n\n'),
    title: item.title ?? undefined,
    type: item.type,
  });

  if (!metadataResult.success) {
    if (!isFailure(metadataResult)) {
      return executionError('Label generation failed with an unknown result shape', target);
    }

    return {
      success: false,
      error: metadataResult.error,
    };
  }

  return {
    success: true,
    data: {
      labels: normalizeLabels(metadataResult.data.tags, item),
      score: 0.6,
      source: mapTargetToLabelSource(target),
      version:
        target.kind === 'stub'
          ? 'stub-label-v1'
          : target.kind === 'apple'
            ? 'apple-label-v1'
            : target.kind === 'local'
              ? 'local-label-v1'
              : RULE_BASED_LABELER_VERSION,
    },
  };
}

function buildStubChatReply(input: ChatExecutionInput): string {
  const contextHint = input.contextItem?.title
    ? `"${input.contextItem.title}"를 참고해서 `
    : '';
  return `${contextHint}아직 연결된 채팅 모델이 없어 간단한 스텁 응답을 반환합니다.\n\n질문: ${input.userText}`;
}

async function executeLocalChatTarget(input: ChatExecutionInput): Promise<Result<string>> {
  const model = getSelectedLocalModel();
  if (!model?.path) {
    return {
      success: false,
      error: appError('GENERATION_ERROR', '선택된 로컬 채팅 모델이 없습니다.'),
    };
  }

  const runtime = getLocalLLMRuntime();
  const prompt = runtime.buildChatPrompt(
    model,
    [{ role: 'user', content: input.userText }],
    input.contextItem
  );
  const result = await runtime.generate(model, prompt, { maxTokens: 512 });
  return { success: true, data: result.text.trim() };
}

async function executeBYOKChatTarget(input: ChatExecutionInput): Promise<Result<string>> {
  const provider = getProvider();
  const apiKey = getApiKey();
  const model = getModel();
  const baseUrl = getBaseUrl();

  if (!provider || !apiKey || !model) {
    return {
      success: false,
      error: appError('GENERATION_ERROR', 'BYOK 채팅 설정이 완료되지 않았습니다.'),
    };
  }

  const prompt = [
    input.contextItem?.title ? `Context title: ${input.contextItem.title}` : null,
    input.contextItem?.body ? `Context body: ${input.contextItem.body}` : null,
    `User: ${input.userText}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const endpoint =
    provider === 'openai'
      ? `${(baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`
      : provider === 'anthropic'
        ? 'https://api.anthropic.com/v1/messages'
        : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers:
      provider === 'openai'
        ? {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          }
        : provider === 'anthropic'
          ? {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            }
          : {
              'Content-Type': 'application/json',
            },
    body:
      provider === 'openai'
        ? JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 512,
            temperature: 0.3,
          })
        : provider === 'anthropic'
          ? JSON.stringify({
              model,
              max_tokens: 512,
              messages: [{ role: 'user', content: prompt }],
            })
          : JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
  });

  if (!response.ok) {
    return {
      success: false,
      error: appError('GENERATION_ERROR', `BYOK 채팅 요청이 실패했습니다 (${response.status})`),
    };
  }

  const data = await response.json();
  const text =
    provider === 'openai'
      ? (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content
      : provider === 'anthropic'
        ? (data as { content?: { text?: string }[] }).content?.[0]?.text
        : (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return {
      success: false,
      error: appError('GENERATION_ERROR', 'BYOK 채팅 응답이 비어 있습니다.'),
    };
  }

  return { success: true, data: text.trim() };
}

export async function executeChatTarget(
  target: AITarget,
  input: ChatExecutionInput
): Promise<Result<string>> {
  switch (target.kind) {
    case 'local':
      return executeLocalChatTarget(input);
    case 'byok':
      return executeBYOKChatTarget(input);
    case 'stub':
      return { success: true, data: buildStubChatReply(input) };
    case 'apple':
      return executionError('Apple target does not support chat generation in this release', target);
    case 'rules':
      return executionError('Rules target does not support chat generation', target);
  }
}

// ============================================================================
// Effect-based Executors
// ============================================================================

function executionEffectError(message: string, target: AITarget): Effect.Effect<never, AppError> {
  return Effect.fail(appError('GENERATION_ERROR', message, { target }));
}

/**
 * Execute metadata target using Effect pattern
 */
export function executeMetadataTargetEffect(
  target: AITarget,
  input: MetadataExecutionInput
): Effect.Effect<{ summary: string; tags: string[] }, AppError> {
  switch (target.kind) {
    case 'apple':
      return appleProvider.generate(input);
    case 'local':
      return localLLMProvider.generate(input);
    case 'byok':
      return byokProvider.generate(input);
    case 'stub':
      return stubProvider.generate(input);
    case 'rules':
      return executionEffectError('Rules target does not support metadata generation', target);
  }
}

/**
 * Execute labeling target using Effect pattern
 */
export function executeLabelingTargetEffect(
  target: AITarget,
  item: KnowledgeItem
): Effect.Effect<LabelingResult, AppError> {
  if (target.kind === 'rules') {
    return Effect.succeed(deriveRuleBasedLabels(item));
  }

  return Effect.gen(function* (_) {
    const metadataResult = yield* _(
      executeMetadataTargetEffect(target, {
        content: [item.title, item.body, item.summary].filter(Boolean).join('\n\n'),
        title: item.title ?? undefined,
        type: item.type,
      })
    );

    return {
      labels: normalizeLabels(metadataResult.tags, item),
      score: 0.6,
      source: mapTargetToLabelSource(target),
      version:
        target.kind === 'stub'
          ? 'stub-label-v1'
          : target.kind === 'apple'
            ? 'apple-label-v1'
            : target.kind === 'local'
              ? 'local-label-v1'
              : RULE_BASED_LABELER_VERSION,
    };
  });
}

/**
 * Execute chat target using Effect pattern
 */
export function executeChatTargetEffect(
  target: AITarget,
  input: ChatExecutionInput
): Effect.Effect<string, AppError> {
  switch (target.kind) {
    case 'stub':
      return Effect.succeed(buildStubChatReply(input));
    case 'apple':
      return executionEffectError('Apple target does not support chat generation in this release', target);
    case 'rules':
      return executionEffectError('Rules target does not support chat generation', target);
    case 'local':
      return executeLocalChatTargetEffect(input);
    case 'byok':
      return executeBYOKChatTargetEffect(input);
  }
}

function executeLocalChatTargetEffect(input: ChatExecutionInput): Effect.Effect<string, AppError> {
  return Effect.gen(function* (_) {
    const model = getSelectedLocalModel();
    if (!model?.path) {
      return yield* _(Effect.fail(
        appError('GENERATION_ERROR', '선택된 로컬 채팅 모델이 없습니다.')
      ));
    }

    const runtime = getLocalLLMRuntime();
    const prompt = runtime.buildChatPrompt(
      model,
      [{ role: 'user', content: input.userText }],
      input.contextItem
    );

    const result = yield* _(Effect.tryPromise({
      try: () => runtime.generate(model, prompt, { maxTokens: 512 }),
      catch: (e) => appError('GENERATION_ERROR', '로컬 채팅 생성 실패', { cause: e }),
    }));

    return result.text.trim();
  });
}

function executeBYOKChatTargetEffect(input: ChatExecutionInput): Effect.Effect<string, AppError> {
  return Effect.gen(function* (_) {
    const provider = getProvider();
    const apiKey = getApiKey();
    const model = getModel();
    const baseUrl = getBaseUrl();

    if (!provider || !apiKey || !model) {
      return yield* _(Effect.fail(
        appError('GENERATION_ERROR', 'BYOK 채팅 설정이 완료되지 않았습니다.')
      ));
    }

    const prompt = [
      input.contextItem?.title ? `Context title: ${input.contextItem.title}` : null,
      input.contextItem?.body ? `Context body: ${input.contextItem.body}` : null,
      `User: ${input.userText}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const endpoint =
      provider === 'openai'
        ? `${(baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`
        : provider === 'anthropic'
          ? 'https://api.anthropic.com/v1/messages'
          : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

    const response = yield* _(Effect.tryPromise({
      try: () => fetch(endpoint, {
        method: 'POST',
        headers:
          provider === 'openai'
            ? {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              }
            : provider === 'anthropic'
              ? {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                }
              : {
                  'Content-Type': 'application/json',
                },
        body:
          provider === 'openai'
            ? JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 512,
                temperature: 0.3,
              })
            : provider === 'anthropic'
              ? JSON.stringify({
                  model,
                  max_tokens: 512,
                  messages: [{ role: 'user', content: prompt }],
                })
              : JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                }),
      }),
      catch: (e) => appError('GENERATION_ERROR', 'BYOK 채팅 네트워크 오류', { cause: e }),
    }));

    if (!response.ok) {
      return yield* _(Effect.fail(
        appError('GENERATION_ERROR', `BYOK 채팅 요청이 실패했습니다 (${response.status})`)
      ));
    }

    const data = yield* _(Effect.tryPromise({
      try: () => response.json(),
      catch: (e) => appError('GENERATION_ERROR', 'BYOK 채팅 응답 파싱 실패', { cause: e }),
    }));

    const text =
      provider === 'openai'
        ? (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content
        : provider === 'anthropic'
          ? (data as { content?: { text?: string }[] }).content?.[0]?.text
          : (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return yield* _(Effect.fail(
        appError('GENERATION_ERROR', 'BYOK 채팅 응답이 비어 있습니다.')
      ));
    }

    return text.trim();
  });
}
