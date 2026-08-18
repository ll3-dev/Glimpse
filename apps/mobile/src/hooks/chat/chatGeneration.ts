import type { MutableRefObject } from 'react';
import { Effect } from "effect";
import { appError, type AppError } from "@/src/lib/effect-result";
import type { LocalLLMRuntime } from '@/src/features/ai/local-llm';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';
import type { KnowledgeItem } from '@glimpse/shared';

export interface ChatMessageWriter {
  (input: { conversationId: string; role: 'user' | 'assistant'; content: string }): Promise<unknown>;
}

export async function generateAssistantReply(params: {
  runtime: LocalLLMRuntime;
  model: LocalModel;
  conversationId: string;
  userText: string;
  previousMessages?: { role: 'user' | 'assistant'; content: string }[];
  contextItem?: KnowledgeItem | null;
  addMessage: ChatMessageWriter;
  streamingTextRef: MutableRefObject<string>;
  onToken: (token: string) => void;
  /**
   * 이 세대가 여전히 유효한지 검사 — abort 시 stopCompletion 이
   * generateStream 을 부분 텍스트로 resolve 시키고 abortAndSave 가
   * 별도로 저장하므로, 저장 직전 false 면 이쪽 저장을 건너뛴다
   * (이중 어시스턴트 메시지 방지).
   */
  isCurrent?: () => boolean;
}): Promise<void> {
  const {
    runtime,
    model,
    conversationId,
    userText,
    previousMessages = [],
    contextItem,
    addMessage,
    streamingTextRef,
    onToken,
    isCurrent = () => true,
  } = params;

  await addMessage({
    conversationId,
    role: 'user',
    content: userText,
  });

  const fullMessages: { role: 'user' | 'assistant'; content: string }[] = [
    ...previousMessages.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userText },
  ];

  const prompt = runtime.buildChatPrompt(
    model,
    fullMessages,
    contextItem
  );

  const result = await runtime.generateStream(model, prompt, {
    maxTokens: 512,
    onToken: (token) => {
      streamingTextRef.current += token;
      onToken(token);
    },
  });

  if (!isCurrent()) {
    return; // abort 가 부분 저장을 이미 처리함
  }

  await addMessage({
    conversationId,
    role: 'assistant',
    content: result.text.trim(),
  });
}

export async function savePartialAssistantReply(params: {
  conversationId: string;
  addMessage: ChatMessageWriter;
  partialText: string;
}): Promise<void> {
  const { conversationId, addMessage, partialText } = params;

  if (!partialText.trim()) {
    return;
  }

  await addMessage({
    conversationId,
    role: 'assistant',
    content: partialText.trim(),
  });
}

// ============================================================================
// Effect-based Chat Generation
// ============================================================================

/**
 * Generate assistant reply using Effect pattern
 */
export function generateAssistantReplyEffect(params: {
  runtime: LocalLLMRuntime;
  model: LocalModel;
  conversationId: string;
  userText: string;
  previousMessages?: { role: 'user' | 'assistant'; content: string }[];
  contextItem?: KnowledgeItem | null;
  addMessage: ChatMessageWriter;
  streamingTextRef: MutableRefObject<string>;
  onToken: (token: string) => void;
}): Effect.Effect<void, AppError> {
  const {
    runtime,
    model,
    conversationId,
    userText,
    previousMessages = [],
    contextItem,
    addMessage,
    streamingTextRef,
    onToken,
  } = params;

  return Effect.gen(function* (_) {
    // Add user message
    yield* _(Effect.tryPromise({
      try: () => addMessage({
        conversationId,
        role: 'user',
        content: userText,
      }),
      catch: (e) => appError('DATABASE_ERROR', 'Failed to save user message', { cause: e }),
    }));

    const fullMessages: { role: 'user' | 'assistant'; content: string }[] = [
      ...previousMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userText },
    ];

    // Build prompt
    const prompt = runtime.buildChatPrompt(
      model,
      fullMessages,
      contextItem
    );

    // Generate response with streaming
    const result = yield* _(Effect.tryPromise({
      try: () => runtime.generateStream(model, prompt, {
        maxTokens: 512,
        onToken: (token) => {
          streamingTextRef.current += token;
          onToken(token);
        },
      }),
      catch: (e) => appError('GENERATION_ERROR', 'Chat generation failed', { cause: e }),
    }));

    // Save assistant message
    yield* _(Effect.tryPromise({
      try: () => addMessage({
        conversationId,
        role: 'assistant',
        content: result.text.trim(),
      }),
      catch: (e) => appError('DATABASE_ERROR', 'Failed to save assistant message', { cause: e }),
    }));
  });
}

/**
 * Save partial assistant reply using Effect pattern
 */
export function savePartialAssistantReplyEffect(params: {
  conversationId: string;
  addMessage: ChatMessageWriter;
  partialText: string;
}): Effect.Effect<void, AppError> {
  const { conversationId, addMessage, partialText } = params;

  if (!partialText.trim()) {
    return Effect.succeed(undefined);
  }

  return Effect.tryPromise({
    try: () => addMessage({
      conversationId,
      role: 'assistant',
      content: partialText.trim(),
    }),
    catch: (e) => appError('DATABASE_ERROR', 'Failed to save partial message', { cause: e }),
  });
}
