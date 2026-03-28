import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createSaveKnowledgeItem,
  type SaveKnowledgeItemDeps,
} from '@/src/features/core/application/capture';
import type { KnowledgeItem } from '@glimpse/shared';
import type { MetadataInput, MetadataOutput } from '@/src/features/ai/metadata';

const createMockDeps = () => {
  const saveKnowledgeItem = mock<(item: KnowledgeItem) => Promise<KnowledgeItem>>();
  const generateMetadata = mock(async (input: MetadataInput) => ({
    summary: `[Stub Summary] ${input.content.substring(0, 30)}...`,
    tags: ['stub-tag', input.type ?? 'unknown'],
  }) as MetadataOutput);
  const initializeReviewSchedule = mock(() => Promise.resolve({
    nextReviewAt: Date.now() + 1_000,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
  }));
  const logger = { error: mock() };
  const generateId = mock(() => 'test-id-1');
  const isIdCollisionError = mock(() => false);

  return {
    coreClient: { saveKnowledgeItem },
    generateMetadata,
    initializeReviewSchedule,
    logger,
    generateId,
    isIdCollisionError,
    maxIdCollisionRetries: 2,
  } as unknown as SaveKnowledgeItemDeps;
};

describe('saveKnowledgeItem', () => {
  let deps: SaveKnowledgeItemDeps;
  let saveKnowledgeItem: ReturnType<typeof createSaveKnowledgeItem>;

  beforeEach(() => {
    deps = createMockDeps();
    saveKnowledgeItem = createSaveKnowledgeItem(deps);
  });

  test('returns validation error for empty note body', async () => {
    const result = await saveKnowledgeItem({
      type: 'note',
      body: '   ',
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
    expect(deps.coreClient.saveKnowledgeItem).not.toHaveBeenCalled();
  });

  test('returns validation error for invalid link url', async () => {
    const result = await saveKnowledgeItem({
      type: 'link',
      url: '   ',
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
    expect(deps.coreClient.saveKnowledgeItem).not.toHaveBeenCalled();
  });

  test('inserts normalized note with initialized review schedule', async () => {
    Date.now = () => 1_700_000_000_000;
    (deps.generateId as ReturnType<typeof mock>)?.mockReturnValue?.('test-id-1');
    (deps.coreClient.saveKnowledgeItem as ReturnType<typeof mock>)?.mockImplementation?.(
      async (item: KnowledgeItem) => item
    );

    const result = await saveKnowledgeItem({
      type: 'note',
      title: '  My title  ',
      body: '  My body  ',
    });

    expect(result.success).toBe(true);
    expect(deps.coreClient.saveKnowledgeItem).toHaveBeenCalledTimes(1);

    const saved = (deps.coreClient.saveKnowledgeItem as ReturnType<typeof mock>)?.mock?.calls?.[0]?.[0] as KnowledgeItem;
    expect(saved.type).toBe('note');
    expect(saved.title).toBe('  My title  ');
    expect(saved.body).toBe('  My body  ');
    expect(saved.createdAt).toBe(1_700_000_000_000);
    expect(deps.initializeReviewSchedule).toHaveBeenCalledWith(1_700_000_000_000);
  });

  test('generates metadata via generateMetadata and stores them for link input', async () => {
    Date.now = () => 1_700_000_100_000;
    (deps.coreClient.saveKnowledgeItem as ReturnType<typeof mock>)?.mockImplementation?.(
      async (item: KnowledgeItem) => item
    );

    const result = await saveKnowledgeItem({
      type: 'link',
      title: 'Article',
      body: 'Read later',
      url: 'https://example.com/post',
    });

    expect(result.success).toBe(true);
    expect(deps.generateMetadata).toHaveBeenCalledTimes(1);

    const metadataInput = (deps.generateMetadata as ReturnType<typeof mock>)?.mock?.calls?.[0]?.[0] as MetadataInput;
    expect(metadataInput.title).toBe('Article');
    expect(metadataInput.type).toBe('link');

    const saved = (deps.coreClient.saveKnowledgeItem as ReturnType<typeof mock>)?.mock?.calls?.[0]?.[0] as KnowledgeItem;
    expect(saved.summary).toContain('Stub Summary');
    expect(saved.tags).toEqual(expect.arrayContaining(['stub-tag', 'link']));
    expect(saved.url).toBe('https://example.com/post');
  });

  test('uses empty metadata on generateMetadata failure (graceful degradation)', async () => {
    (deps.generateMetadata as ReturnType<typeof mock>)?.mockRejectedValueOnce?.(
      new Error('AI failed')
    );
    (deps.coreClient.saveKnowledgeItem as ReturnType<typeof mock>)?.mockImplementation?.(
      async (item: KnowledgeItem) => item
    );

    const result = await saveKnowledgeItem({
      type: 'note',
      body: 'test content',
    });

    expect(result.success).toBe(false);
  });

  test('retries once on ID collision and then succeeds', async () => {
    const collisionError = new Error('UNIQUE constraint failed: knowledge_items.id');
    (deps.isIdCollisionError as ReturnType<typeof mock>)?.mockReturnValue?.(true);
    (deps.coreClient.saveKnowledgeItem as ReturnType<typeof mock>)
      ?.mockRejectedValueOnce?.(collisionError)
      ?.mockImplementationOnce?.(async (item: KnowledgeItem) => item);

    const result = await saveKnowledgeItem({
      type: 'note',
      body: 'retry case',
    });

    expect(result.success).toBe(true);
    expect(deps.coreClient.saveKnowledgeItem).toHaveBeenCalledTimes(2);
  });

  test('returns retry-exhausted error after repeated ID collisions', async () => {
    const collisionError = new Error('UNIQUE constraint failed: knowledge_items.id');
    (deps.isIdCollisionError as ReturnType<typeof mock>)?.mockReturnValue?.(true);
    (deps.coreClient.saveKnowledgeItem as ReturnType<typeof mock>)?.mockRejectedValue?.(collisionError);

    const result = await saveKnowledgeItem({
      type: 'note',
      body: 'collision storm',
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('MAX_RETRIES_EXCEEDED');
    }
  });

  test('returns error immediately for non-collision database failure', async () => {
    (deps.isIdCollisionError as ReturnType<typeof mock>)?.mockReturnValue?.(false);
    (deps.coreClient.saveKnowledgeItem as ReturnType<typeof mock>)?.mockRejectedValue?.(
      new Error('disk I/O error')
    );

    const result = await saveKnowledgeItem({
      type: 'note',
      body: 'non collision fail',
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('UNKNOWN_ERROR');
    }
    expect(deps.coreClient.saveKnowledgeItem).toHaveBeenCalledTimes(1);
  });
});
