import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createSaveKnowledgeItem,
  type SaveKnowledgeItemDeps,
} from './saveKnowledgeItem';

const insertValues = mock(async () => undefined);
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
    if (!result.success) {
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
    if (!result.success) {
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
});
