/**
 * Chat message generation.
 *
 * Routes through the AI provider system (local-llm / BYOK / rules / stub)
 * based on current desktop settings.
 */

import { generateChatResponse } from './router';

export async function generateResponse(
  messages: { role: string; content: string }[],
  _options?: { onToken?: (token: string) => void },
): Promise<string> {
  if (messages.length === 0) return '[No message received.]';

  return generateChatResponse(messages);
}
