/**
 * AI Provider Router
 *
 * Selects the appropriate provider for each AI feature (metadata, labeling, chat)
 * based on the current desktop settings. Falls back through a chain:
 *
 *   configured provider -> rules -> stub
 *
 * No Effect dependency -- plain async/await.
 */

import type { AIProvider, AIFeature, CompletionRequest, CompletionResponse, MetadataOutput, StreamingCallbacks } from './types';
import { createLocalLLMProvider, completeLocalLLMStream } from './providers/local-llm-provider';
import { createBYOKProvider, completeBYOKStream } from './providers/byok-provider';
import { rulesProvider } from './providers/rules-provider';
import { stubProvider } from './providers/stub-provider';
import { loadSettings } from '@/lib/settings-storage';

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

function providerFromKind(kind: string): AIProvider {
  switch (kind) {
    case 'local-llm':
      return createLocalLLMProvider();
    case 'byok':
      return createBYOKProvider();
    case 'rules':
      return rulesProvider;
    case 'stub':
      return stubProvider;
    default:
      return rulesProvider;
  }
}

/**
 * Return a provider that is actually available, walking the fallback chain:
 *   preferred -> rules -> stub
 */
async function resolveProvider(preferredKind: string): Promise<AIProvider> {
  const preferred = providerFromKind(preferredKind);
  if (await preferred.isAvailable()) return preferred;

  if (preferredKind !== 'rules') {
    if (await rulesProvider.isAvailable()) return rulesProvider;
  }

  return stubProvider;
}

/**
 * Map a feature to the configured provider kind from settings.
 */
function configuredKindForFeature(feature: AIFeature): string {
  const settings = loadSettings();

  // Chat uses the top-level aiProvider setting
  if (feature === 'chat') return settings.aiProvider;

  // Metadata and labeling use the same provider for now
  return settings.aiProvider;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the best available provider for a given feature.
 */
export async function getProviderForFeature(feature: AIFeature): Promise<AIProvider> {
  const kind = configuredKindForFeature(feature);
  return resolveProvider(kind);
}

/**
 * Complete a prompt using the provider configured for the given feature.
 */
export async function completeForFeature(
  feature: AIFeature,
  request: CompletionRequest,
): Promise<CompletionResponse> {
  const provider = await getProviderForFeature(feature);
  return provider.complete(request);
}

/**
 * Generate metadata (summary + tags) using the provider configured for metadata.
 */
export async function generateMetadata(
  content: string,
  title?: string | null,
): Promise<MetadataOutput> {
  const provider = await getProviderForFeature('metadata');
  return provider.generateMetadata(content, title);
}

/**
 * Generate a chat response using the provider configured for chat.
 */
export async function generateChatResponse(
  messages: { role: string; content: string }[],
): Promise<string> {
  const provider = await getProviderForFeature('chat');

  // Convert message history into a single prompt for providers that need it.
  // Local LLM and BYOK providers handle multi-turn differently, but the
  // CompletionRequest interface accepts a single prompt. For chat we join
  // the conversation into a structured prompt.
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const systemPrompt = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n') || undefined;

  const contextMessages = messages
    .filter((m) => m.role !== 'system')
    .slice(-10) // keep last 10 messages for context window
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = contextMessages;

  const response = await provider.complete({
    prompt,
    systemPrompt: systemPrompt || 'You are a helpful assistant. Respond concisely.',
    maxTokens: 512,
    temperature: 0.7,
  });

  // Strip any "Assistant: " prefix the model might echo
  const text = response.text.replace(/^Assistant:\s*/i, '').trim();
  return text || lastUserMsg?.content
    ? `I received your message about "${(lastUserMsg?.content ?? '').slice(0, 50)}..."`
    : '[No response]';
}

/**
 * Generate a chat response with streaming token delivery.
 *
 * Attempts to stream tokens via the BYOK SSE endpoint. If the provider
 * doesn't support streaming (e.g. local-llm, rules, stub), falls back
 * to the non-streaming `generateChatResponse` path.
 *
 * Returns the full response text after streaming completes.
 */
export async function generateChatStreamResponse(
  messages: { role: string; content: string }[],
  callbacks: StreamingCallbacks,
): Promise<string> {
  const settings = loadSettings();

  // BYOK: stream via SSE
  if (settings.aiProvider === 'byok') {
    const streamResult = await completeBYOKStream(messages, callbacks);
    if (streamResult !== null) {
      const text = streamResult.replace(/^Assistant:\s*/i, '').trim();
      return text || '[No response]';
    }
  }

  // Local LLM: stream via Tauri events
  if (settings.aiProvider === 'local-llm') {
    const contextMessages = messages
      .filter((m) => m.role !== 'system')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const systemMsg = messages.find((m) => m.role === 'system');
    const allMessages = [
      ...(systemMsg ? [systemMsg] : []),
      ...contextMessages,
    ];

    const streamResult = await completeLocalLLMStream(allMessages, callbacks);
    if (streamResult !== null) {
      return streamResult || '[No response]';
    }
  }

  // Fallback: non-streaming path
  try {
    const fullText = await generateChatResponse(messages);
    // Deliver as a single token burst so the UI still gets onToken/onDone
    if (fullText) {
      callbacks.onToken(fullText);
    }
    callbacks.onDone(fullText);
    return fullText;
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}
