/**
 * MMKV Storage Instance
 *
 * Fast key-value storage using react-native-mmkv.
 * Used for persisting app settings and preferences.
 */

import { createMMKV, type MMKV } from 'react-native-mmkv';

export const storage: MMKV = createMMKV({
  id: 'glimpse-settings',
});

/**
 * Storage keys for type-safe access
 */
export const StorageKeys = {
  // Local LLM settings
  LOCAL_LLM_ENABLED: 'local_llm_enabled',
  LOCAL_LLM_SELECTED_MODEL: 'local_llm_selected_model',
  // BYOK settings
  BYOK_ENABLED: 'byok_enabled',
  BYOK_PROVIDER: 'byok_provider',
  BYOK_API_KEY: 'byok_api_key',
  BYOK_BASE_URL: 'byok_base_url',
  BYOK_MODEL: 'byok_model',
} as const;

/**
 * Type for storage keys
 */
export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
