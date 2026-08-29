import type { KnowledgeItem } from '@glimpse/shared';
import { cosineSimilarity } from '@glimpse/features';

/**
 * Chat RAG retrieval — embeds are supplied by the caller; this module is pure.
 * Ranks the library against the user's question and assembles a single
 * `role: 'system'` message that both desktop provider paths preserve.
 */

export const RAG_MAX_ENTRIES = 5;
/** 이 이하 유사도는 무관한 노트 — 주입하면 오히려 답변 품질을 해친다. */
export const RAG_SIMILARITY_THRESHOLD = 0.55;
/** 시스템 프롬프트 폭주 방지 발췌 길이. */
const EXCERPT_LENGTH = 400;

export interface KnowledgeContextInput {
  queryEmbedding: readonly number[];
  itemEmbeddings: ReadonlyMap<string, readonly number[]>;
  maxEntries?: number;
}

export interface KnowledgeContextEntry {
  item: KnowledgeItem;
  score: number;
}

export interface KnowledgeContextResult {
  entries: KnowledgeContextEntry[];
  /** 주입할 system 메시지(0~1개). 비어 있으면 호출부는 아무것도 하지 않는다. */
  contextMessages: { role: 'system'; content: string }[];
}

function itemExcerpt(item: KnowledgeItem): string {
  const parts = [item.title, item.summary, item.body?.slice(0, EXCERPT_LENGTH)]
    .filter((part): part is string => Boolean(part));
  return parts.join('\n');
}

export function buildKnowledgeContext(
  items: KnowledgeItem[],
  input: KnowledgeContextInput,
): KnowledgeContextResult {
  if (input.queryEmbedding.length === 0 || items.length === 0) {
    return { entries: [], contextMessages: [] };
  }

  const scored = items
    .map((item) => {
      const vector = input.itemEmbeddings.get(item.id);
      return vector
        ? { item, score: cosineSimilarity(input.queryEmbedding, vector) }
        : null;
    })
    .filter((entry): entry is KnowledgeContextEntry => entry !== null && entry.score >= RAG_SIMILARITY_THRESHOLD)
    .sort((left, right) => right.score - left.score)
    .slice(0, input.maxEntries ?? RAG_MAX_ENTRIES);

  if (scored.length === 0) {
    return { entries: [], contextMessages: [] };
  }

  const sections = scored.map(
    (entry, index) =>
      `[${index + 1}] ${entry.item.title ?? '(제목 없음)'}\n${itemExcerpt(entry.item)}`,
  );
  const content =
    '아래는 사용자가 저장한 지식 노트 중 이 질문과 관련된 발췌이다. ' +
    '답변할 때 이 내용을 참고하고, 발췌에 없는 사실은 추측하지 않는다.\n\n' +
    sections.join('\n\n');

  return {
    entries: scored,
    contextMessages: [{ role: 'system', content }],
  };
}
