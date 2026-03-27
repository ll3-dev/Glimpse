export type ParsedChatMessageContent = {
  reasoning: string | null;
  reasoningSummary: string | null;
  answer: string;
  isReasoningInProgress: boolean;
};

const THINK_OPEN_TAG = '<think>';
const THINK_CLOSE_TAG = '</think>';

function summarizeReasoning(reasoning: string | null): string | null {
  if (!reasoning) {
    return null;
  }

  const normalized = reasoning
    .replace(/\s+/g, ' ')
    .replace(/^\d+[\.\)]\s*/g, '')
    .trim();

  if (!normalized) {
    return null;
  }

  const firstSentence = normalized.match(/(.+?[.!?。]|.{1,90})(\s|$)/)?.[1]?.trim() ?? normalized;
  const summary = firstSentence.length > 90
    ? `${firstSentence.slice(0, 87).trimEnd()}...`
    : firstSentence;

  return summary;
}

function createParsedContent(
  reasoning: string | null,
  answer: string,
  isReasoningInProgress: boolean
): ParsedChatMessageContent {
  return {
    reasoning,
    reasoningSummary: summarizeReasoning(reasoning),
    answer: answer.trim(),
    isReasoningInProgress,
  };
}

export function parseChatMessageContent(content: string): ParsedChatMessageContent {
  const normalized = content ?? '';
  const thinkOpen = normalized.indexOf(THINK_OPEN_TAG);
  const thinkClose = normalized.indexOf(THINK_CLOSE_TAG);

  if (thinkOpen < 0) {
    return createParsedContent(null, normalized, false);
  }

  if (thinkClose < 0 || thinkClose < thinkOpen) {
    const reasoning = normalized.slice(thinkOpen + THINK_OPEN_TAG.length).trim() || null;
    return createParsedContent(reasoning, normalized.slice(0, thinkOpen), true);
  }

  const reasoning = normalized.slice(thinkOpen + THINK_OPEN_TAG.length, thinkClose).trim() || null;
  const answer = `${normalized.slice(0, thinkOpen)} ${normalized.slice(thinkClose + THINK_CLOSE_TAG.length)}`;

  return createParsedContent(reasoning, answer, false);
}
