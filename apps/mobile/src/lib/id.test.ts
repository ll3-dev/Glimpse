import { describe, expect, test } from 'bun:test';
import { isIdCollisionError } from './id';

describe('isIdCollisionError', () => {
  test('detects sqlite unique constraint on id column', () => {
    const error = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: knowledge_items.id');
    expect(isIdCollisionError(error)).toBe(true);
  });

  test('detects duplicate id wording', () => {
    expect(isIdCollisionError('duplicate key value violates primary key (id)')).toBe(true);
  });

  test('returns false for constraint on non-id column', () => {
    const error = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: knowledge_items.url');
    expect(isIdCollisionError(error)).toBe(false);
  });

  test('returns false for non-constraint errors', () => {
    expect(isIdCollisionError(new Error('disk I/O error'))).toBe(false);
  });
});
