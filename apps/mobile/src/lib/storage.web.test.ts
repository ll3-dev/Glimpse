import { describe, expect, test } from 'bun:test';
import { storage } from './storage.web';

describe('web storage server fallback', () => {
  test('can be imported and used without window or localStorage', () => {
    storage.clearAll();
    storage.set('enabled', true);
    storage.set('name', 'glimpse');

    expect(storage.getBoolean('enabled')).toBe(true);
    expect(storage.getString('name')).toBe('glimpse');
    expect(storage.getAllKeys().sort()).toEqual(['enabled', 'name']);
  });
});
