/** Values supported by both native MMKV and the web storage adapter. */
export type StorageValue = string | number | boolean | ArrayBuffer;

/**
 * Small storage contract used by application settings.
 *
 * Keeping consumers on this subset prevents platform-specific MMKV APIs from
 * leaking into stores and makes server rendering safe on web.
 */
export interface KeyValueStorage {
  set(key: string, value: StorageValue): void;
  getBoolean(key: string): boolean | undefined;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  contains(key: string): boolean;
  remove(key: string): boolean;
  getAllKeys(): string[];
  clearAll(): void;
}

/** Storage keys for type-safe access. */
export const StorageKeys = {
  // App preferences
  APP_LOCALE: 'app_locale',
  // AI target settings
  AI_DEFAULT_TARGET: 'ai_default_target',
  AI_METADATA_TARGET: 'ai_metadata_target',
  AI_LABELING_TARGET: 'ai_labeling_target',
  AI_CHAT_TARGET: 'ai_chat_target',
  // Local LLM settings
  LOCAL_LLM_ENABLED: 'local_llm_enabled',
  LOCAL_LLM_SELECTED_MODEL: 'local_llm_selected_model',
  LOCAL_MODEL_DOWNLOAD_SESSION: 'local_model_download_session',
  // BYOK settings
  BYOK_ENABLED: 'byok_enabled',
  BYOK_PROVIDER: 'byok_provider',
  BYOK_API_KEY: 'byok_api_key',
  BYOK_BASE_URL: 'byok_base_url',
  BYOK_MODEL: 'byok_model',
  // Recommendation scheduling
  RECOMMENDATION_CADENCE: 'recommendation_cadence',
  RECOMMENDATION_LAST_REFRESH_AT: 'recommendation_last_refresh_at',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
