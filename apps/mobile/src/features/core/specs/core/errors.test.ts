import { describe, expect, test } from 'bun:test';
import { mapRustErrorToCode } from './errors';

describe('mapRustErrorToCode', () => {
  test('maps known rust error names to normalized bridge codes', () => {
    expect(mapRustErrorToCode('InvalidInput("bad request")')).toBe('INVALID_INPUT');
    expect(mapRustErrorToCode('NotFound("missing item")')).toBe('NOT_FOUND');
    expect(mapRustErrorToCode('Conflict("duplicate id")')).toBe('CONFLICT');
    expect(mapRustErrorToCode('Database("sqlite busy")')).toBe('DATABASE');
    expect(mapRustErrorToCode('Timeout("slow query")')).toBe('TIMEOUT');
  });

  test('falls back to INTERNAL for unknown rust error kinds', () => {
    expect(mapRustErrorToCode('Cancelled("user left screen")')).toBe('INTERNAL');
    expect(mapRustErrorToCode('SomethingElse("boom")')).toBe('INTERNAL');
  });
});
