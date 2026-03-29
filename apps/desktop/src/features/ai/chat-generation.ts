/**
 * Chat message generation.
 *
 * Routes through the AI provider system (local-llm / BYOK / rules / stub)
 * based on current desktop settings. Supports streaming token delivery
 * when an onToken callback is provided.
 */

import { generateChatResponse, generateChatStreamResponse } from './router';

export async function generateResponse(
  messages: { role: string; content: string }[],
  options?: { onToken?: (token: string) => void },
): Promise<string> {
  if (messages.length === 0) return '[No message received.]';

  // If the caller wants streaming tokens, use the streaming path.
  if (options?.onToken) {
    let fullText = '';
    return generateChatStreamResponse(messages, {
      onToken: (token) => {
        fullText += token;
        options.onToken?.(token);
      },
      onDone: () => {
        // Streaming complete; fullText already accumulated
      },
      onError: () => {
        // Error already handled upstream; the caller gets the thrown error
      },
    }).then((text) => text || fullText);
  }

  // Non-streaming fallback
  return generateChatResponse(messages);
}
