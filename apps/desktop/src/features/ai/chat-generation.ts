/**
 * Echo stub for chat message generation.
 * This will be replaced with llama.cpp/LLM integration later.
 */
export async function generateResponse(
  messages: { role: string; content: string }[],
  _options?: { onToken?: (token: string) => void }
): Promise<string> {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return '[Echo] No message received.';

  const preview =
    lastMessage.content.length > 100
      ? lastMessage.content.slice(0, 100) + '...'
      : lastMessage.content;
  return `[Echo] You said: "${preview}"`;
}
