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
  contextItem?: KnowledgeItem | null;
  addMessage: ChatMessageWriter;
  streamingTextRef: MutableRefObject<string>;
  onToken: (token: string) => void;
}): Promise<void> {
  const {
    runtime,
    model,
    conversationId,
    userText,
    contextItem,
    addMessage,
    streamingTextRef,
    onToken,
  } = params;

  await addMessage({
    conversationId,
    role: 'user',
    content: userText,
  });

  const prompt = runtime.buildChatPrompt(
    model,
    [{ role: 'user', content: userText }],
    contextItem
  );

  const result = await runtime.generateStream(model, prompt, {
    maxTokens: 512,
    onToken: (token) => {
      streamingTextRef.current += token;
      onToken(token);
    },
  });

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

    // Build prompt
    const prompt = runtime.buildChatPrompt(
      model,
      [{ role: 'user', content: userText }],
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
