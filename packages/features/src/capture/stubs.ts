export function generateSummaryStub(content: string): string {
  if (!content || content.trim().length === 0) return '';
  const preview = content.trim().substring(0, 100);
  return `[Stub Summary] ${preview}${content.length > 100 ? '...' : ''}`;
}
export function generateTagsStub(content: string): string[] {
  if (!content || content.trim().length === 0) return [];
  const tags: string[] = [];
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('http') || lowerContent.includes('www')) tags.push('link');
  if (lowerContent.includes('todo') || lowerContent.includes('task') || lowerContent.includes('할일')) {
    tags.push('todo');
  }
  if (lowerContent.includes('important') || lowerContent.includes('urgent') || lowerContent.includes('중요')) {
    tags.push('important');
  }
  if (lowerContent.includes('idea') || lowerContent.includes('brainstorm') || lowerContent.includes('아이디어')) {
    tags.push('idea');
  }

  const tokenMatches = lowerContent.match(/[a-z0-9]{2,}|[가-힣]{2,}/g) ?? [];
  const stopwords = new Set([
    'http', 'https', 'www', 'com', 'and', 'the', 'this', 'that', 'with', 'from',
    'read', 'later', 'check', '관련', '내용', '메모', '링크', '저장',
  ]);
  for (const token of tokenMatches) {
    if (stopwords.has(token) || /^\d+$/.test(token)) continue;
    tags.push(token);
    if (tags.length >= 6) break;
  }
  return [...new Set(tags)];
}
