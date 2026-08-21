/**
 * MMKV Storage Instance
 *
 * Fast key-value storage using react-native-mmkv.
 * Used for persisting app settings and preferences.
 */

import { createMMKV } from 'react-native-mmkv';
import type { KeyValueStorage } from './storage.shared';

export const storage: KeyValueStorage = createMMKV({
  id: 'glimpse-settings',
});

export { StorageKeys } from './storage.shared';
export type { KeyValueStorage, StorageKey, StorageValue } from './storage.shared';
