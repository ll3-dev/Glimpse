/**
 * Parse Query to Keyword
 */

const KOREAN_PARTICLES = [
  '을', '를', '이', '가', '은', '는', '에', '에서',
  '으로', '로', '와', '과', '의', '만', '도', '부터', '까지', '처럼', '보다',
];

const KOREAN_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /(.+?)\s*(?:관련\s*(?:있어?|된?|)?)/, description: 'related to X' },
  { pattern: /(.+?)\s*(?:있어?|없어?)/, description: 'existence queries' },
  { pattern: /(.+?)\s*(?:찾아(?:줘)?)/, description: 'find X' },
  { pattern: /(.+?)\s*검색/, description: 'search X' },
  { pattern: /(.+?)\s*(?:알려|말해)줘/, description: 'tell me about X' },
];

const ENGLISH_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /(?:what\s+(?:is|about)|(?:tell\s+me\s+about))\s+(.+)/i, description: 'what is/tell me about' },
  { pattern: /find\s+(.+)/i, description: 'find X' },
  { pattern: /search\s+(?:for\s+)?(.+)/i, description: 'search for X' },
];

function cleanKeyword(keyword: string): string {
  let cleaned = keyword.trim();
  for (const particle of KOREAN_PARTICLES) {
    const regex = new RegExp(particle + '$');
    cleaned = cleaned.replace(regex, '');
  }
  return cleaned.trim();
}

export function parseQueryToKeyword(query: string): string {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return '';

  for (const { pattern } of KOREAN_PATTERNS) {
    const match = trimmedQuery.match(pattern);
    if (match && match[1]) {
      const keyword = cleanKeyword(match[1]);
      if (keyword) return keyword;
    }
  }

  for (const { pattern } of ENGLISH_PATTERNS) {
    const match = trimmedQuery.match(pattern);
    if (match && match[1]) {
      const keyword = cleanKeyword(match[1]);
      if (keyword) return keyword;
    }
  }

  return trimmedQuery;
}
