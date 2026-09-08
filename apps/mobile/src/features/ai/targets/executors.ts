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
import { localLLMProvider } from '../providers/local-llm-provider';
import { stubProvider } from '../metadata/stub-provider';
import { createAppleIntelligenceBridge } from '../apple-intelligence-bridge';
import { isAppleIntelligenceEnabled } from '@/src/features/settings/appleIntelligenceToggle';
import { deriveRuleBasedLabels, RULE_BASED_LABELER_VERSION } from '@/src/features/labeling/rule-based-labeler';
import { LABEL_TAXONOMY, type LabelingResult } from '@/src/features/labeling/types';
import {
  getAvailableLocalModels,
  getSelectedLocalModel,
} from '@/src/features/settings/local-llm.selectors';
import { getLocalLLMRuntime } from '@/src/hooks/chat/chatRuntime';
import type { LlamaPromptInput } from '@/src/features/ai/llama-service';
import type { AITarget } from './types';
import { selectRecentChatMessages } from '../chat-context';
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
  }
}

function resolveChatContextItems(input: ChatExecutionInput): KnowledgeItem[] {
  if (input.contextItems) return input.contextItems;
  return input.contextItem ? [input.contextItem] : [];
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

export async function executeChatTarget(
  target: AITarget,
  input: ChatExecutionInput
): Promise<Result<string>> {
  switch (target.kind) {
    case 'local':
      return executeLocalChatTarget(target, input);
    case 'stub':
      return executionError('채팅 모델이 설정되지 않았습니다. 설정에서 로컬 모델을 연결해 주세요.', target);
    case 'apple':
      return executionError('Apple target does not support chat generation in this release', target);
    case 'rules':
      return executionError('Rules target does not support chat generation', target);
  }
}

/**
 * 오늘 요약 내러티브 생성 — 완성 프롬프트를 받아 텍스트를 돌려준다.
 *
 * Apple은 메타데이터 생성과 같은 bridge.generate 계약을 재사용하고,
 * 로컬은 채팅 런타임으로 단발 프롬프트를 처리한다. stub/rules는 미지원 —
 * 호출부(resolveEffectiveTarget('summary') 결과)가 숨김으로 동작한다.
 */
export async function executeSummaryTarget(
  target: AITarget,
  prompt: string
): Promise<Result<string>> {
  switch (target.kind) {
    case 'apple': {
      if (!isAppleIntelligenceEnabled()) {
        return executionError('Apple Intelligence is disabled in settings', target);
      }
      const bridge = createAppleIntelligenceBridge();
      const availability = await bridge.isAvailable();
      if (!availability.available) {
        return executionError(
          `Apple Intelligence is not available: ${availability.reason ?? 'unknown'}`,
          target,
        );
      }
      const result = await bridge.generate(prompt, { maxTokens: 220, temperature: 0.4 });
      return { success: true, data: result.text.trim() };
    }
    case 'local': {
      // 대상 ID에 핀된 모델 우선 — 채팅과 같은 규칙.
      const pinnedModelId = target.modelId || null;
      const model = pinnedModelId
        ? getAvailableLocalModels().find((candidate) => candidate.id === pinnedModelId) ??
          getSelectedLocalModel()
        : getSelectedLocalModel();
      if (!model?.path) {
        return executionError('요약에 쓸 로컬 모델이 없습니다.', target);
      }
      const runtime = getLocalLLMRuntime();
      const llamaPrompt = runtime.buildChatPrompt(model, [
        { role: 'user' as const, content: prompt },
      ], []);
      const result = await runtime.generate(model, llamaPrompt, { maxTokens: 256 });
      return { success: true, data: result.text.trim() };
    }
    case 'stub':
    case 'rules':
      return executionError('This target does not support summary generation', target);
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
      return executionEffectError('채팅 모델이 설정되지 않았습니다. 설정에서 로컬 모델을 연결해 주세요.', target);
    case 'apple':
      return executionEffectError('Apple target does not support chat generation in this release', target);
    case 'rules':
      return executionEffectError('Rules target does not support chat generation', target);
    case 'local':
      return executeLocalChatTargetEffect(target, input);
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
