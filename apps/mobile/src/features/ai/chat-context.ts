import type { KnowledgeItem } from '@glimpse/shared';
import type { LocalLLMMessage } from './local-llm';

const DEFAULT_RETRIEVAL_LIMIT = 3;
const DEFAULT_HISTORY_CHARACTER_BUDGET = 8_000;
const MAX_ITEM_BODY_CHARACTERS = 1_500;

function tokenize(value: string): string[] {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function searchableText(item: KnowledgeItem): string {
  return [item.title, item.body, item.summary, ...(item.tags ?? [])]
    .filter(Boolean)
    .join('\n')
    .toLocaleLowerCase();
}

function scoreKnowledgeItem(query: string, item: KnowledgeItem): number {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return 0;

  const title = item.title?.toLocaleLowerCase() ?? '';
  const body = [item.body, item.summary].filter(Boolean).join('\n').toLocaleLowerCase();
  const tags = new Set((item.tags ?? []).map((tag) => tag.toLocaleLowerCase()));
  const fullText = searchableText(item);
  const tokens = [...new Set(tokenize(normalizedQuery).filter((token) => token.length > 1))];

  let score = 0;
  if (title.includes(normalizedQuery)) score += 12;
  if (body.includes(normalizedQuery)) score += 6;
  for (const token of tokens) {
    if (title.includes(token)) score += 4;
    if (tags.has(token)) score += 5;
    if (body.includes(token)) score += 1;
    if (fullText.startsWith(token)) score += 1;
  }
  return score;
}

export function selectRelevantKnowledge(
  query: string,
  items: KnowledgeItem[],
  options: { limit?: number; excludeIds?: string[] } = {}
): KnowledgeItem[] {
  const excluded = new Set(options.excludeIds ?? []);
  const scored: { item: KnowledgeItem; score: number }[] = [];

  for (const item of items) {
    if (excluded.has(item.id)) continue;
    const score = scoreKnowledgeItem(query, item);
    if (score > 0) scored.push({ item, score });
  }

  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return Number(right.item.updatedAt) - Number(left.item.updatedAt);
  });

  const selected = scored.slice(0, options.limit ?? DEFAULT_RETRIEVAL_LIMIT);
  return selected.map(({ item }) => item);
}

export function buildChatKnowledgeContext(
  query: string,
  primaryItem: KnowledgeItem | null | undefined,
  allItems: KnowledgeItem[]
): KnowledgeItem[] {
  const primary = primaryItem ? [primaryItem] : [];
  const related = selectRelevantKnowledge(query, allItems, {
    limit: DEFAULT_RETRIEVAL_LIMIT,
    excludeIds: primary.map((item) => item.id),
  });
  return [...primary, ...related];
}

export function selectRecentChatMessages(
  messages: LocalLLMMessage[],
  characterBudget: number = DEFAULT_HISTORY_CHARACTER_BUDGET
): LocalLLMMessage[] {
  const selected: LocalLLMMessage[] = [];
  let used = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const size = message.content.length;
    if (selected.length > 0 && used + size > characterBudget) break;
    selected.push(message);
    used += size;
  }

  return selected.reverse();
}

export function formatKnowledgeContext(items: KnowledgeItem[]): string {
  if (items.length === 0) return '';

  const sections = items.map((item, index) => {
    const body = [item.body, item.summary]
      .filter(Boolean)
      .join('\n')
      .slice(0, MAX_ITEM_BODY_CHARACTERS);
    return [
      `[지식 ${index + 1}]`,
      item.title ? `제목: ${item.title}` : null,
      body ? `내용: ${body}` : null,
      item.url ? `URL: ${item.url}` : null,
      item.tags?.length ? `태그: ${item.tags.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  });

  return `아래는 사용자의 보관함에서 검색된 참고 자료입니다. 자료에 없는 사실은 추측하지 말고, 참고한 경우 [지식 N]으로 출처를 표시하세요.\n\n${sections.join('\n\n')}`;
}
