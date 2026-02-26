import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createGetPendingRecommendations,
  type GetPendingRecommendationsDeps,
} from './getPendingRecommendations';

const db = {
  select: mock(),
};

const recommendations = {
  status: 'status_column',
};

const knowledgeItems = {
  id: 'id_column',
};

const eqMock = mock((left: unknown, right: unknown) => ({ left, right }));
const inArrayMock = mock((left: unknown, right: unknown[]) => ({ left, right }));

const deps = {
  db,
  recommendations,
  knowledgeItems,
  eq: eqMock,
  inArray: inArrayMock,
} as unknown as GetPendingRecommendationsDeps;

const getPendingRecommendations = createGetPendingRecommendations(deps);

describe('getPendingRecommendations', () => {
  beforeEach(() => {
    db.select.mockReset();
    eqMock.mockClear();
    inArrayMock.mockClear();
  });

  test('returns empty list when there are no pending recommendations', async () => {
    db.select.mockReturnValueOnce({
      from: mock(() => ({
        where: mock(async () => []),
      })),
    });

    const result = await getPendingRecommendations();

    expect(result).toEqual({ success: true, data: [] });
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  test('joins pending recommendations with fetched items', async () => {
    const pending = [
      { id: 'r1', itemA_id: 'a', itemB_id: 'b', status: 'pending' },
      { id: 'r2', itemA_id: 'a', itemB_id: 'missing', status: 'pending' },
    ];

    const items = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ];

    db.select
      .mockReturnValueOnce({
        from: mock(() => ({
          where: mock(async () => pending),
        })),
      })
      .mockReturnValueOnce({
        from: mock(() => ({
          where: mock(async () => items),
        })),
      });

    const result = await getPendingRecommendations();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.recommendation.id).toBe('r1');
      expect(result.data[0]?.itemA.id).toBe('a');
      expect(result.data[0]?.itemB.id).toBe('b');
    }
    expect(inArrayMock).toHaveBeenCalledWith('id_column', ['a', 'b', 'missing']);
  });

  test('returns DATABASE_ERROR when query fails', async () => {
    db.select.mockImplementation(() => {
      throw new Error('db fail');
    });

    const result = await getPendingRecommendations();

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.code).toBe('DATABASE_ERROR');
    }
  });
});
