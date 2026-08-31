import { describe, expect, mock, spyOn, test } from 'bun:test';
import type { KnowledgeItem } from '@glimpse/shared';
import {
  createContentForProcessing,
  createSaveKnowledgeItem,
  normalizeText,
  validateInput,
} from '@glimpse/features';

describe('core capture application layer', () => {
  test('validateInput enforces required fields per input type', () => {
    expect(validateInput({ type: 'note', body: '   ' })).toEqual([
      { field: 'body', message: 'Body is required for notes' },
    ]);
    expect(validateInput({ type: 'link', url: '   ' })).toEqual([
      { field: 'url', message: 'URL is required for links' },
    ]);
    expect(validateInput({ type: 'share', url: null, body: ' ' })).toEqual([
      { field: 'url', message: 'URL or body is required for shares' },
    ]);
  });

  test('normalizeText trims and collapses repeated whitespace', () => {
    expect(normalizeText('  hello \n\n   world\t again  ')).toBe('hello world again');
  });

  test('createContentForProcessing combines relevant fields by type', () => {
    expect(
      createContentForProcessing({
        type: 'highlight',
        title: 'Snippet',
        text: 'Important line',
        sourceUrl: 'https://example.com',
      })
    ).toBe('Snippet\n\nImportant line\n\nhttps://example.com');

    expect(
      createContentForProcessing({
        type: 'share',
        title: 'Shared',
        body: 'Body',
        url: 'https://shared.example',
      })
    ).toBe('Shared\n\nBody\n\nhttps://shared.example');
  });

  test('createSaveKnowledgeItem short-circuits validation failures before metadata generation', async () => {
    const generateMetadata = mock(async () => ({ summary: 'summary', tags: ['tag'] }));
    const saveKnowledgeItem = mock(async (item: KnowledgeItem) => item);

    const result = await createSaveKnowledgeItem({
      coreClient: { saveKnowledgeItem },
      generateMetadata,
      initializeReviewSchedule: mock(() => Promise.resolve({
        nextReviewAt: 123,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
      })),
      logger: { error: mock() },
      generateId: () => 'id-1',
      isIdCollisionError: () => false,
      maxIdCollisionRetries: 2,
    })({
      type: 'link',
      url: '   ',
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'URL is required for links',
      },
    });
    expect(generateMetadata).not.toHaveBeenCalled();
    expect(saveKnowledgeItem).not.toHaveBeenCalled();
  });

  test('createSaveKnowledgeItem retries id collisions and falls back to metadata summary for screenshot body', async () => {
    const saveKnowledgeItem = mock(async (item: KnowledgeItem) => {
      if (item.id === 'id-1') {
        throw new Error('duplicate key');
      }
      return item;
    });
    const isIdCollisionError = mock((error: unknown) =>
      error instanceof Error && error.message === 'duplicate key'
    );
    const dateNow = spyOn(Date, 'now');
    dateNow.mockReturnValue(1_700_000_000_000);

    const result = await createSaveKnowledgeItem({
      coreClient: { saveKnowledgeItem },
      generateMetadata: mock(async () => ({
        summary: 'generated summary',
        tags: ['generated'],
      })),
      initializeReviewSchedule: mock(() => Promise.resolve({
        nextReviewAt: 1_700_000_600_000,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
      })),
      logger: { error: mock() },
      generateId: mock(() => 'id-1').mockReturnValueOnce('id-1').mockReturnValueOnce('id-2'),
      isIdCollisionError,
      maxIdCollisionRetries: 2,
    })({
      type: 'screenshot',
      imageData: 'base64',
      title: 'Shot',
      tags: null,
    });

    expect(saveKnowledgeItem).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      success: true,
      item: {
        id: 'id-2',
        body: 'generated summary',
        summary: 'generated summary',
        tags: ['generated'],
        nextReviewAt: 1_700_000_600_000,
      },
    });
    dateNow.mockRestore();
  });

  test('createSaveKnowledgeItem enqueues saved items for labeling with requested timestamp', async () => {
    const saveKnowledgeItem = mock(async (item: KnowledgeItem) => item);
    const dateNow = spyOn(Date, 'now');
    dateNow.mockReturnValue(1_700_000_000_000);

    const result = await createSaveKnowledgeItem({
      coreClient: { saveKnowledgeItem },
      generateMetadata: mock(async () => ({ summary: 'summary', tags: ['tag'] })),
      initializeReviewSchedule: mock(() => Promise.resolve({
        nextReviewAt: 123,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
      })),
      logger: { error: mock() },
      generateId: () => 'id-1',
      isIdCollisionError: () => false,
      maxIdCollisionRetries: 2,
    })({
      type: 'note',
      body: 'hello',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.item.labelStatus).toBe('pending');
      expect(result.item.labelRequestedAt).toBe(1_700_000_000_000);
    }
    expect(saveKnowledgeItem.mock.calls[0][0]).toMatchObject({
      labelStatus: 'pending',
      labelRequestedAt: 1_700_000_000_000,
    });
    dateNow.mockRestore();
  });

  test('createSaveKnowledgeItem returns max retries exceeded after repeated collisions', async () => {
    const result = await createSaveKnowledgeItem({
      coreClient: {
        saveKnowledgeItem: mock(async () => {
          throw new Error('duplicate');
        }),
      },
      generateMetadata: mock(async () => ({ summary: 'summary', tags: [] })),
      initializeReviewSchedule: mock(() => Promise.resolve({
        nextReviewAt: 123,
        stability: null,
        difficulty: null,
        lastReviewedAt: null,
      })),
      logger: { error: mock() },
      generateId: () => 'same-id',
      isIdCollisionError: () => true,
      maxIdCollisionRetries: 2,
    })({
      type: 'note',
      body: 'hello',
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: 'MAX_RETRIES_EXCEEDED',
        message: 'Max ID collision retries exceeded',
      },
    });
  });
});
