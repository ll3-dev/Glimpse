export type ParsedChatMessageContent = {
  reasoning: string | null;
  reasoningSummary: string | null;
  answer: string;
  isReasoningInProgress: boolean;
};

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

export function parseChatMessageContent(content: string): ParsedChatMessageContent {
  const normalized = content ?? '';
  const thinkOpen = normalized.indexOf('<think>');
  const thinkClose = normalized.indexOf('</think>');

  if (thinkOpen < 0) {
    return {
      reasoning: null,
      reasoningSummary: null,
      answer: normalized.trim(),
      isReasoningInProgress: false,
    };
  }

  if (thinkClose < 0 || thinkClose < thinkOpen) {
    const reasoning = normalized.slice(thinkOpen + '<think>'.length).trim() || null;
    return {
      reasoning,
      reasoningSummary: summarizeReasoning(reasoning),
      answer: normalized.slice(0, thinkOpen).trim(),
      isReasoningInProgress: true,
    };
  }

  const reasoning = normalized
    .slice(thinkOpen + '<think>'.length, thinkClose)
    .trim();

  const answer = `${normalized.slice(0, thinkOpen)} ${normalized.slice(thinkClose + '</think>'.length)}`
    .trim();

  return {
    reasoning: reasoning || null,
    reasoningSummary: summarizeReasoning(reasoning),
    answer,
    isReasoningInProgress: false,
  };
}
