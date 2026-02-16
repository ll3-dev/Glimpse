import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createSaveKnowledgeItem,
  type SaveKnowledgeItemDeps,
} from './saveKnowledgeItem';
import { MAX_ID_COLLISION_RETRIES } from '@/src/lib/id';

const insertValues = mock(async (_value: unknown) => undefined);
const db = {
  insert: mock(() => ({
    values: insertValues,
  })),
};

const knowledgeItems = { table: 'knowledge_items' };
const initializeReviewSchedule = mock((createdAt: number) => ({
  nextReviewAt: createdAt + 1_000,
  stability: null,
  difficulty: null,
  lastReviewedAt: null,
}));
const generateSummaryStub = mock(() => 'summary');
const generateTagsStub = mock(() => ['stub-tag']);
const logger = { error: mock() };

const deps = {
  db,
  knowledgeItems,
  initializeReviewSchedule,
  generateSummaryStub,
  generateTagsStub,
  logger,
} as unknown as SaveKnowledgeItemDeps;

const saveKnowledgeItem = createSaveKnowledgeItem(deps);

describe('saveKnowledgeItem', () => {
  beforeEach(() => {
    db.insert.mockClear();
    insertValues.mockClear();
    initializeReviewSchedule.mockClear();
    generateSummaryStub.mockClear();
    generateTagsStub.mockClear();
    logger.error.mockClear();
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
    expect(db.insert).not.toHaveBeenCalled();
  });

  test('returns validation error for invalid link url', async () => {
    const result = await saveKnowledgeItem({
      type: 'link',
      url: 'not-a-url',
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.message).toBe('Invalid URL format');
    }
    expect(db.insert).not.toHaveBeenCalled();
  });

  test('inserts normalized note with initialized review schedule', async () => {
    Date.now = () => 1_700_000_000_000;
    Math.random = () => 0.123456789;

    const result = await saveKnowledgeItem({
      type: 'note',
      title: '  My title  ',
      body: '  My body  ',
    });

    expect(result.success).toBe(true);
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledTimes(1);

    const inserted = insertValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(inserted.type).toBe('note');
    expect(inserted.title).toBe('My title');
    expect(inserted.body).toBe('My body');
    expect(inserted.url).toBeNull();
    expect(inserted.createdAt).toBe(1_700_000_000_000);
    expect(inserted.updatedAt).toBe(1_700_000_000_000);
    expect(inserted.nextReviewAt).toBe(1_700_000_001_000);
    expect(initializeReviewSchedule).toHaveBeenCalledWith(1_700_000_000_000);
  });

  test('generates metadata stubs and stores them for link input', async () => {
    Date.now = () => 1_700_000_100_000;
    Math.random = () => 0.234567891;

    const result = await saveKnowledgeItem({
      type: 'link',
      title: 'Article',
      body: 'Read later',
      url: 'https://example.com/post',
    });

    expect(result.success).toBe(true);
    expect(generateSummaryStub).toHaveBeenCalledWith(
      'Article\nRead later\nhttps://example.com/post'
    );
    expect(generateTagsStub).toHaveBeenCalledWith(
      'Article\nRead later\nhttps://example.com/post'
    );

    const inserted = insertValues.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(inserted.summary).toBe('summary');
    expect(inserted.tags).toEqual(['stub-tag']);
    expect(inserted.url).toBe('https://example.com/post');
  });

  test('retries once on ID collision and then succeeds', async () => {
    insertValues.mockRejectedValueOnce(
      new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: knowledge_items.id')
    );
    insertValues.mockResolvedValueOnce(undefined);

    const result = await saveKnowledgeItem({
      type: 'note',
      body: 'retry case',
    });

    expect(result.success).toBe(true);
    expect(insertValues).toHaveBeenCalledTimes(2);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('returns retry-exhausted DATABASE_ERROR after repeated ID collisions', async () => {
    insertValues.mockImplementation(() =>
      Promise.reject(
        new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: knowledge_items.id')
      )
    );

    const result = await saveKnowledgeItem({
      type: 'note',
      body: 'collision storm',
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('DATABASE_ERROR');
      expect(result.error.message).toBe(
        'Failed to save knowledge item after ID collision retries'
      );
    }
    expect(insertValues).toHaveBeenCalledTimes(MAX_ID_COLLISION_RETRIES + 1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  test('returns DATABASE_ERROR immediately for non-collision database failure', async () => {
    insertValues.mockRejectedValueOnce(new Error('disk I/O error'));

    const result = await saveKnowledgeItem({
      type: 'note',
      body: 'non collision fail',
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('DATABASE_ERROR');
      expect(result.error.message).toBe('Failed to save knowledge item');
    }
    expect(insertValues).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
