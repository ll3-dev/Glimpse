import { describe, expect, mock, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import { itemEmbeddingText } from '@glimpse/hooks';
import {
  NOTE_NEXT_REVIEW_MS,
  TOOL_LIST_LIMIT_MAX,
  createToolExecutor,
  lexicalScore,
  type KnowledgeToolDeps,
} from './tool-definitions';

function item(overrides: Partial<KnowledgeItem> & { id: string }): KnowledgeItem {
  return {
    type: 'note',
    title: null,
    body: null,
    url: null,
    summary: null,
    tags: null,
    labels: null,
    provisionalLabels: null,
    labelStatus: 'pending',
    labelSource: null,
    labelVersion: null,
    labelScore: null,
    labelRequestedAt: null,
    labelCompletedAt: null,
    labelError: null,
    createdAt: 0,
    updatedAt: null,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
    ...overrides,
  };
}

function makeDeps(library: KnowledgeItem[], embedImpl?: KnowledgeToolDeps['embed']) {
  const saved: KnowledgeItem[] = [];
  const deps: KnowledgeToolDeps = {
    loadLibrary: async () => library,
    saveKnowledgeItem: async (entry) => {
      saved.push(entry);
      return entry;
    },
    embed: embedImpl ?? (async () => null),
    generateId: () => 'generated-id',
    now: () => 1_700_000_000_000,
  };
  return { deps, saved };
}

describe('createToolExecutor list_recent_knowledge', () => {
  test('returns the newest items first, capped by the requested limit', async () => {
    const library = Array.from({ length: TOOL_LIST_LIMIT_MAX + 5 }, (_, i) =>
      item({ id: `item-${i}`, title: `note ${i}`, createdAt: i }),
    );
    const execute = createToolExecutor(makeDeps(library).deps);

    const result = (await execute('list_recent_knowledge', '{}')) as {
      items: { id: string }[];
    };
    expect(result.items).toHaveLength(5); // 기본 limit
    expect(result.items[0].id).toBe(`item-${TOOL_LIST_LIMIT_MAX + 4}`);

    const limited = (await execute(
      'list_recent_knowledge',
      `{"limit":${TOOL_LIST_LIMIT_MAX}}`,
    )) as { items: { id: string }[] };
    expect(limited.items).toHaveLength(TOOL_LIST_LIMIT_MAX);

    const overMax = (await execute('list_recent_knowledge', '{"limit":999}')) as {
      items: { id: string }[];
    };
    expect(overMax.items).toHaveLength(TOOL_LIST_LIMIT_MAX);
  });
});

describe('createToolExecutor search_knowledge', () => {
  test('ranks by embedding cosine similarity', async () => {
    const relevant = item({ id: 'relevant', title: 'rust ownership notes' });
    const other = item({ id: 'other', title: 'pasta recipe' });
    const embed = mock(async (_question: string, texts: string[]) => ({
      queryVector: [1, 0],
      itemVectors: new Map(
        texts.map((text) => [
          text,
          text === itemEmbeddingText(relevant) ? [1, 0] : [0, 1],
        ]),
      ),
    }));
    const execute = createToolExecutor(makeDeps([relevant, other], embed).deps);

    const result = (await execute('search_knowledge', '{"query":"rust"}')) as {
      items: { id: string; score: number }[];
    };
    expect(result.items[0].id).toBe('relevant');
    expect(result.items[0].score).toBeCloseTo(1, 3);
    expect(result.items[1].id).toBe('other');
  });

  test('falls back to lexical token overlap when embeddings are unavailable', async () => {
    const matching = item({ id: 'matching', title: 'garlic bread baking guide' });
    const unrelated = item({ id: 'unrelated', title: 'rust ownership notes' });
    const execute = createToolExecutor(makeDeps([matching, unrelated]).deps);

    const result = (await execute('search_knowledge', '{"query":"garlic bread"}')) as {
      items: { id: string }[];
    };
    expect(result.items[0].id).toBe('matching');
  });

  test('empty query returns no items', async () => {
    const execute = createToolExecutor(makeDeps([item({ id: 'a', title: 'x' })]).deps);
    const result = (await execute('search_knowledge', '{"query":"  "}')) as {
      items: unknown[];
    };
    expect(result.items).toEqual([]);
  });
});

describe('createToolExecutor save_note', () => {
  test('saves a pending note enrolled for review after 24h', async () => {
    const { deps, saved } = makeDeps([]);
    const execute = createToolExecutor(deps);

    const result = (await execute('save_note', '{"title":"아이디어","body":"메모 내용"}')) as {
      id: string;
      saved: boolean;
    };

    expect(result).toEqual({ id: 'generated-id', saved: true });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      type: 'note',
      title: '아이디어',
      body: '메모 내용',
      labelStatus: 'pending',
      createdAt: 1_700_000_000_000,
    });
    expect(saved[0].nextReviewAt).toBe(1_700_000_000_000 + NOTE_NEXT_REVIEW_MS);
  });

  test('rejects an empty body without saving', async () => {
    const { deps, saved } = makeDeps([]);
    const execute = createToolExecutor(deps);

    await expect(execute('save_note', '{"body":"   "}')).rejects.toThrow('non-empty body');
    expect(saved).toHaveLength(0);
  });
});

describe('createToolExecutor error contracts', () => {
  test('unknown tool and invalid JSON arguments return {error} instead of throwing', async () => {
    const execute = createToolExecutor(makeDeps([]).deps);

    expect(await execute('does_not_exist', '{}')).toEqual({
      error: 'unknown tool: does_not_exist',
    });
    expect(await execute('save_note', '{invalid json')).toEqual({
      error: 'invalid JSON arguments for save_note',
    });
  });
});

describe('lexicalScore', () => {
  test('counts multi-character query tokens present in the text', () => {
    expect(lexicalScore('garlic bread', 'fresh garlic loaf')).toBe(1);
    expect(lexicalScore('rust', 'rust ownership')).toBe(1);
    expect(lexicalScore('a', 'anything')).toBe(0);
  });
});
