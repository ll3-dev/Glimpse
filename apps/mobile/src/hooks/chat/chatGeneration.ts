import type { MutableRefObject } from 'react';
import type { LocalLLMRuntime } from '@/src/features/ai/local-llm';
import type { LocalModel } from '@/src/stores/settings/local-llm.store';
import type { KnowledgeItem } from '@/src/db';

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
