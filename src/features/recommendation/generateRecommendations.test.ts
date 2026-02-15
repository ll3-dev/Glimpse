import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

const db = {
  select: mock(),
  insert: mock(),
};

const recommendations = { table: 'recommendations' };

const getWeeklyItems = mock();
const nanoid = mock(() => 'generated-id');
const insertValues = mock(async () => undefined);

mock.module('@/src/db', () => ({
  db,
  recommendations,
}));

mock.module('./getWeeklyItems', () => ({
  getWeeklyItems,
}));

mock.module('nanoid', () => ({
  nanoid,
}));

const { generateRecommendations, saveRecommendations } = await import('./generateRecommendations');

describe('generateRecommendations', () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    db.select.mockReset();
    db.insert.mockReset();
    getWeeklyItems.mockReset();
    nanoid.mockClear();
    insertValues.mockReset();
    db.insert.mockReturnValue({ values: insertValues });
  });

  test('bubbles weekly query failure', async () => {
    getWeeklyItems.mockResolvedValue({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed' },
    });

    const result = await generateRecommendations();
    expect(result.success).toBe(false);
  });

  test('returns empty when fewer than two weekly items', async () => {
    getWeeklyItems.mockResolvedValue({
      success: true,
      data: [{ id: 'a', tags: ['x'] }],
    });

    const result = await generateRecommendations();
    expect(result).toEqual({ success: true, data: [] });
  });

  test('creates candidates with tag overlap excluding existing pairs', async () => {
    getWeeklyItems.mockResolvedValue({
      success: true,
      data: [
        { id: 'a', tags: ['react', 'ts'] },
        { id: 'b', tags: ['ts', 'db'] },
        { id: 'c', tags: ['swift'] },
      ],
    });
    db.select.mockReturnValue({
      from: mock(async () => [{ itemA_id: 'a', itemB_id: 'c' }]),
    });

    const result = await generateRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.itemA.id).toBe('a');
      expect(result.data[0]?.itemB.id).toBe('b');
      expect(result.data[0]?.reason).toBe('공통 태그 1개');
    }
  });

  test('saveRecommendations inserts mapped rows', async () => {
    const recs = [
      {
        itemA: { id: 'a' },
        itemB: { id: 'b' },
        reason: 'r1',
      },
    ] as any;

    const result = await saveRecommendations(recs);

    expect(result).toEqual({ success: true });
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledTimes(1);
    const rows = insertValues.mock.calls[0]?.[0] as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe('generated-id');
    expect(rows[0]?.itemA_id).toBe('a');
    expect(rows[0]?.itemB_id).toBe('b');
    expect(rows[0]?.status).toBe('pending');
  });

  test('saveRecommendations skips insert for empty input', async () => {
    const result = await saveRecommendations([]);
    expect(result).toEqual({ success: true });
    expect(db.insert).not.toHaveBeenCalled();
  });
});
