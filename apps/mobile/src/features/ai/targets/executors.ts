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
import {
  getAvailableLocalModels,
  getSelectedLocalModel,
} from '@/src/features/settings/local-llm.selectors';
import { getLocalLLMRuntime } from '@/src/hooks/chat/chatRuntime';
import type { LlamaPromptInput } from '@/src/features/ai/llama-service';
import { getApiKey, getBaseUrl, getModel, getProvider } from '@/src/features/settings/byok.selectors';
import { ensureBYOKHydrated } from '@/src/stores/settings/byok.store';
import type { AITarget } from './types';
import {
  formatKnowledgeContext,
  selectRecentChatMessages,
} from '../chat-context';
import type { LocalLLMMessage } from '../local-llm';

export interface MetadataExecutionInput {
  content: string;
  title?: string;
  type?: 'note' | 'link' | 'highlight' | 'screenshot' | 'share';
}

export interface ChatExecutionInput {
  userText: string;
  messages?: LocalLLMMessage[];
  contextItems?: KnowledgeItem[];
  /** @deprecated Use contextItems for grounded multi-item chat. */
  contextItem?: KnowledgeItem | null;
}

type BYOKProvider = NonNullable<ReturnType<typeof getProvider>>;

type BYOKRequest = {
  endpoint: string;
  init: RequestInit;
};

const DEFAULT_BYOK_CHAT_TIMEOUT_MS = 30_000;
let byokChatTimeoutMs = DEFAULT_BYOK_CHAT_TIMEOUT_MS;
/** 마지막 fetch가 타임아웃으로 중단됐는지 — catch 분류용 모듈 플래그. */
let timedOut = false;

/** 테스트 전용 — 타임아웃을 짧게 줄여 타임아웃 경로를 실제로 태운다. */
export function setBYOKChatTimeoutForTests(ms: number): void {
  byokChatTimeoutMs = ms;
}

export function resetBYOKChatTimeoutForTests(): void {
  byokChatTimeoutMs = DEFAULT_BYOK_CHAT_TIMEOUT_MS;
}

/**
 * BYOK 채팅 fetch에 타임아웃을 부착한다.
 *
 * AbortSignal.timeout은 React Native 런타임에 존재하지 않는다(polyfill에
 * static timeout이 없음 — byok-provider.ts와 동일한 근거). 플래그 기반
 * AbortController로 대체하고, 타임아웃 여부는 에러 이름이 아닌 timedOut
 * 플래그로 판정한다. abort 시 RN fetch는 AbortError로 거부하므로 호출부의
 * catch에서도 판정할 수 있게 timedOut을 외부로 노출한다.
 */
async function fetchWithBYOKTimeout(
  endpoint: string,
  init: RequestInit
): Promise<{ response: Response; timedOut: boolean }> {
  timedOut = false;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, byokChatTimeoutMs);
  try {
    const response = await fetch(endpoint, { ...init, signal: controller.signal });
    return { response, timedOut };
  } finally {
    clearTimeout(timer);
  }
}

type BYOKChatConfig = {
  provider: BYOKProvider;
  apiKey: string;
  model: string;
  baseUrl: string | null;
};

type LocalChatContext = {
  model: NonNullable<ReturnType<typeof getSelectedLocalModel>>;
  prompt: LlamaPromptInput;
  runtime: ReturnType<typeof getLocalLLMRuntime>;
};

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

function buildLabelingMetadataInput(item: KnowledgeItem): MetadataExecutionInput {
  return {
    content: [item.title, item.body, item.summary].filter(Boolean).join('\n\n'),
    title: item.title ?? undefined,
    type: item.type,
  };
}

function getLabelVersion(target: AITarget): string {
  switch (target.kind) {
    case 'stub':
      return 'stub-label-v1';
    case 'apple':
      return 'apple-label-v1';
    case 'local':
      return 'local-label-v1';
    case 'rules':
      return RULE_BASED_LABELER_VERSION;
    case 'byok':
      return 'byok-label-v1';
  }
}

function resolveChatContextItems(input: ChatExecutionInput): KnowledgeItem[] {
  if (input.contextItems) return input.contextItems;
  return input.contextItem ? [input.contextItem] : [];
}

function buildChatSystemPrompt(input: ChatExecutionInput): string {
  const base = '당신은 Glimpse 사용자의 지식 보관함을 돕는 AI 어시스턴트입니다. 한국어로 정확하고 자연스럽게 답하세요.';
  const context = formatKnowledgeContext(resolveChatContextItems(input));
  return context ? `${base}\n\n${context}` : base;
}

function buildChatMessages(input: ChatExecutionInput): LocalLLMMessage[] {
  return [
    ...selectRecentChatMessages(input.messages ?? []),
    { role: 'user' as const, content: input.userText },
  ];
}

function resolveLocalChatContext(target: AITarget, input: ChatExecutionInput): Result<LocalChatContext> {
  // 대상 ID에 핀된 모델이 있으면 그 모델을 우선하고, 없으면 기존처럼 선택된 모델로 폴백한다.
  const pinnedModelId = target.kind === 'local' && target.modelId ? target.modelId : null;
  const model = pinnedModelId
    ? getAvailableLocalModels().find((candidate) => candidate.id === pinnedModelId) ?? getSelectedLocalModel()
    : getSelectedLocalModel();

  if (!model?.path) {
    return {
      success: false,
      error: appError(
        'GENERATION_ERROR',
        pinnedModelId
          ? '고정된 로컬 채팅 모델을 사용할 수 없습니다.'
          : '선택된 로컬 채팅 모델이 없습니다.'
      ),
    };
  }

  const runtime = getLocalLLMRuntime();
  return {
    success: true,
    data: {
      model,
      runtime,
      prompt: runtime.buildChatPrompt(
        model,
        buildChatMessages(input),
        resolveChatContextItems(input)
      ),
    },
  };
}

function resolveBYOKChatConfig(target: AITarget): Result<BYOKChatConfig> {
  const provider = getProvider();
  const apiKey = getApiKey();
  const modelOverride = target.kind === 'byok' && target.model ? target.model : null;
  const model = modelOverride ?? getModel();

  if (!provider || !apiKey || !model) {
    return {
      success: false,
      error: appError('GENERATION_ERROR', 'BYOK 채팅 설정이 완료되지 않았습니다.'),
    };
  }

  return {
    success: true,
    data: {
      provider,
      apiKey,
      model,
      baseUrl: getBaseUrl(),
    },
  };
}

function resolveBYOKRequest(
  provider: BYOKProvider,
  apiKey: string,
  model: string,
  baseUrl: string | null,
  input: ChatExecutionInput
): BYOKRequest {
  const system = buildChatSystemPrompt(input);
  const messages = buildChatMessages(input);

  if (provider === 'openai') {
    return {
      endpoint: `${(baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`,
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, ...messages],
          max_tokens: 512,
          temperature: 0.3,
        }),
      },
    };
  }

  if (provider === 'anthropic') {
    return {
      endpoint: 'https://api.anthropic.com/v1/messages',
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 512,
          system,
          messages,
        }),
      },
    };
  }

  return {
    endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
      }),
    },
  };
}

function parseBYOKChatResponse(provider: BYOKProvider, data: unknown): string | null {
  const text =
    provider === 'openai'
      ? (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content
      : provider === 'anthropic'
        ? (data as { content?: { text?: string }[] }).content?.[0]?.text
        : (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts?.[0]?.text;

  return text?.trim() ?? null;
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

  const metadataResult = await executeMetadataTarget(target, buildLabelingMetadataInput(item));

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
      version: getLabelVersion(target),
    },
  };
}

async function executeLocalChatTarget(target: AITarget, input: ChatExecutionInput): Promise<Result<string>> {
  const localChat = resolveLocalChatContext(target, input);
  if (!localChat.success) {
    return isFailure(localChat)
      ? { success: false, error: localChat.error }
      : { success: false, error: appError('GENERATION_ERROR', '로컬 채팅 컨텍스트를 확인할 수 없습니다.') };
  }

  const result = await localChat.data.runtime.generate(
    localChat.data.model,
    localChat.data.prompt,
    { maxTokens: 512 }
  );
  return { success: true, data: result.text.trim() };
}

async function executeBYOKChatTarget(target: AITarget, input: ChatExecutionInput): Promise<Result<string>> {
  // 콜드스타트 직후 SecureStore 복원이 끝나지 않은 경우 키 null로
  // 거부되는 레이스 방지 — BYOK 경로 진입 시 복원 완료를 보장한다.
  await ensureBYOKHydrated();
  const byokConfig = resolveBYOKChatConfig(target);
  if (!byokConfig.success) {
    return isFailure(byokConfig)
      ? { success: false, error: byokConfig.error }
      : { success: false, error: appError('GENERATION_ERROR', 'BYOK 채팅 설정을 확인할 수 없습니다.') };
  }

  const request = resolveBYOKRequest(
    byokConfig.data.provider,
    byokConfig.data.apiKey,
    byokConfig.data.model,
    byokConfig.data.baseUrl,
    input
  );
  const { response, timedOut: fetchTimedOut } = await fetchWithBYOKTimeout(
    request.endpoint,
    request.init
  ).catch((e) => {
    // abort 시 RN fetch는 AbortError로 거부한다 — 플래그로 타임아웃을 분류한다.
    if (!timedOut) {
      throw e;
    }
    return { response: null, timedOut: true };
  });

  if (fetchTimedOut) {
    return {
      success: false,
      error: appError(
        'GENERATION_ERROR',
        `BYOK 채팅 요청이 ${byokChatTimeoutMs / 1000}초 안에 응답하지 않았습니다. 네트워크 상태를 확인하거나 나중에 다시 시도해 주세요.`
      ),
    };
  }

  if (!response || !response.ok) {
    return {
      success: false,
      error: appError('GENERATION_ERROR', `BYOK 채팅 요청이 실패했습니다 (${response?.status ?? 0})`),
    };
  }

  const data = await response.json();
  const text = parseBYOKChatResponse(byokConfig.data.provider, data);

  if (!text) {
    return {
      success: false,
      error: appError('GENERATION_ERROR', 'BYOK 채팅 응답이 비어 있습니다.'),
    };
  }
  return { success: true, data: text };
}

export async function executeChatTarget(
  target: AITarget,
  input: ChatExecutionInput
): Promise<Result<string>> {
  switch (target.kind) {
    case 'local':
      return executeLocalChatTarget(target, input);
    case 'byok':
      return executeBYOKChatTarget(target, input);
    case 'stub':
      return executionError('채팅 모델이 설정되지 않았습니다. 설정에서 로컬 모델 또는 BYOK를 연결해 주세요.', target);
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
      executeMetadataTargetEffect(target, buildLabelingMetadataInput(item))
    );

    return {
      labels: normalizeLabels(metadataResult.tags, item),
      score: 0.6,
      source: mapTargetToLabelSource(target),
      version: getLabelVersion(target),
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
      return executionEffectError('채팅 모델이 설정되지 않았습니다. 설정에서 로컬 모델 또는 BYOK를 연결해 주세요.', target);
    case 'apple':
      return executionEffectError('Apple target does not support chat generation in this release', target);
    case 'rules':
      return executionEffectError('Rules target does not support chat generation', target);
    case 'local':
      return executeLocalChatTargetEffect(target, input);
    case 'byok':
      return executeBYOKChatTargetEffect(target, input);
  }
}

function executeLocalChatTargetEffect(target: AITarget, input: ChatExecutionInput): Effect.Effect<string, AppError> {
  return Effect.gen(function* (_) {
    const localChat = resolveLocalChatContext(target, input);
    if (!localChat.success) {
      return yield* _(Effect.fail(
        isFailure(localChat)
          ? localChat.error
          : appError('GENERATION_ERROR', '로컬 채팅 컨텍스트를 확인할 수 없습니다.')
      ));
    }

    const result = yield* _(Effect.tryPromise({
      try: () => localChat.data.runtime.generate(
        localChat.data.model,
        localChat.data.prompt,
        { maxTokens: 512 }
      ),
      catch: (e) => appError('GENERATION_ERROR', '로컬 채팅 생성 실패', { cause: e }),
    }));

    return result.text.trim();
  });
}

function executeBYOKChatTargetEffect(target: AITarget, input: ChatExecutionInput): Effect.Effect<string, AppError> {
  return Effect.gen(function* (_) {
    // BYOK 경로 진입 시 SecureStore 복원 완료 보장 — 콜드스타트 레이스 방지
    yield* _(Effect.tryPromise({
      try: () => ensureBYOKHydrated(),
      catch: () => appError('GENERATION_ERROR', 'BYOK 설정을 복원하는 데 실패했습니다.'),
    }));
    const byokConfig = resolveBYOKChatConfig(target);
    if (!byokConfig.success) {
      return yield* _(Effect.fail(
        isFailure(byokConfig)
          ? byokConfig.error
          : appError('GENERATION_ERROR', 'BYOK 채팅 설정을 확인할 수 없습니다.')
      ));
    }

    const request = resolveBYOKRequest(
      byokConfig.data.provider,
      byokConfig.data.apiKey,
      byokConfig.data.model,
      byokConfig.data.baseUrl,
      input
    );

    const { response, timedOut: fetchTimedOut } = yield* _(Effect.tryPromise({
      try: () => fetchWithBYOKTimeout(request.endpoint, request.init),
      // abort 시 RN fetch는 AbortError로 거부하므로 catch에서 플래그로 분류한다.
      catch: (e) =>
        timedOut
          ? appError(
              'GENERATION_ERROR',
              `BYOK 채팅 요청이 ${byokChatTimeoutMs / 1000}초 안에 응답하지 않았습니다. 네트워크 상태를 확인하거나 나중에 다시 시도해 주세요.`
            )
          : appError('GENERATION_ERROR', 'BYOK 채팅 네트워크 오류', { cause: e }),
    }));

    if (fetchTimedOut) {
      return yield* _(Effect.fail(
        appError(
          'GENERATION_ERROR',
          `BYOK 채팅 요청이 ${byokChatTimeoutMs / 1000}초 안에 응답하지 않았습니다. 네트워크 상태를 확인하거나 나중에 다시 시도해 주세요.`
        )
      ));
    }

    if (!response.ok) {
      return yield* _(Effect.fail(
        appError('GENERATION_ERROR', `BYOK 채팅 요청이 실패했습니다 (${response.status})`)
      ));
    }

    const data = yield* _(Effect.tryPromise({
      try: () => response.json(),
      catch: (e) => appError('GENERATION_ERROR', 'BYOK 채팅 응답 파싱 실패', { cause: e }),
    }));

    const text = parseBYOKChatResponse(byokConfig.data.provider, data);

    if (!text) {
      return yield* _(Effect.fail(
        appError('GENERATION_ERROR', 'BYOK 채팅 응답이 비어 있습니다.')
      ));
    }
    return text;
  });
}
