export const MAX_PREVIEW_LENGTH = 140;
const SENTENCE_ENDINGS = ['.', '!', '?', '。', '！', '？'];

/** 마크다운 기호를 걷어내고 본문만 남긴다 (최소한만). */
function stripMarkdownNoise(text: string): string {
  return text.replace(/^#+\s+/gm, '').replace(/[*_`>]/g, '').trim();
}

function findSentenceBoundary(text: string): number {
  for (let i = 0; i < text.length; i++) {
    if (SENTENCE_ENDINGS.includes(text[i])) return i + 1;
  }
  return -1;
}

/**
 * 스텁(미설정) 상태에서 보여줄 "미리보기" 요약.
 * 첫 완결 문장(없으면 첫 줄), 140자 초과 시 문장/공백 경계에서 절단+말줄임.
 */
export function buildSummaryPreview(content: string): string {
  const text = stripMarkdownNoise(content);
  if (text.length === 0) return '';

  const newlineIdx = text.indexOf('\n');
  const firstLine = newlineIdx >= 0 ? text.slice(0, newlineIdx).trim() : text;

  const boundary = findSentenceBoundary(firstLine);
  if (boundary > 0) {
    const sentence = firstLine.slice(0, boundary).trim();
    if (sentence.length <= MAX_PREVIEW_LENGTH) return sentence;
    return truncate(firstLine);
  }
  if (firstLine.length <= MAX_PREVIEW_LENGTH) return firstLine;
  return truncate(firstLine);
}

function truncate(text: string): string {
  // 말줄임 3자를 포함해 최대 길이를 넘지 않도록 잘라낸다
  const maxBody = MAX_PREVIEW_LENGTH - 3;
  const window = text.slice(0, maxBody);
  const lastSpace = window.lastIndexOf(' ');
  const cut = lastSpace > maxBody / 2 ? window.slice(0, lastSpace) : window;
  return `${cut.trimEnd()}...`;
}
