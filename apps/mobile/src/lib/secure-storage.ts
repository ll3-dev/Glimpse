/**
 * Secure Storage Module
 *
 * Provides encrypted storage for sensitive secrets (e.g. BYOK API Keys, tokens)
 * using iOS Keychain / Android Keystore via expo-secure-store.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { storage } from './storage';
import { logger } from '../utils/logger';

export const SecureStorageKeys = {
  BYOK_API_KEY: 'glimpse_secure_byok_api_key',
} as const;

export type SecureStorageKey =
  (typeof SecureStorageKeys)[keyof typeof SecureStorageKeys];

// In-memory cache for fast synchronous access after initial hydration
const memoryCache = new Map<string, string | null>();

/**
 * Check if secure store is available on current platform
 */
async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Get item securely from Keychain / Keystore
 */
export async function getSecureItem(key: SecureStorageKey | string): Promise<string | null> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) ?? null;
  }

  try {
    const available = await isSecureStoreAvailable();
    if (!available) {
      // Fallback for web / environments without native keychain
      const fallbackValue = storage.getString(key) ?? null;
      memoryCache.set(key, fallbackValue);
      return fallbackValue;
    }

    const value = await SecureStore.getItemAsync(key, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    memoryCache.set(key, value ?? null);
    return value ?? null;
  } catch (error) {
    logger.error(`Failed to get secure item for key: ${key}`, error);
    return null;
  }
}

/**
 * Set item securely in Keychain / Keystore
 */
export async function setSecureItem(
  key: SecureStorageKey | string,
  value: string
): Promise<void> {
  memoryCache.set(key, value);

  try {
    const available = await isSecureStoreAvailable();
    if (!available) {
      storage.set(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch (error) {
    logger.error(`Failed to set secure item for key: ${key}`, error);
  }
}

/**
 * Delete item securely from Keychain / Keystore
 */
export async function deleteSecureItem(key: SecureStorageKey | string): Promise<void> {
  memoryCache.delete(key);

  try {
    const available = await isSecureStoreAvailable();
    if (!available) {
      storage.remove(key);
      return;
    }

    await SecureStore.deleteItemAsync(key, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch (error) {
    logger.error(`Failed to delete secure item for key: ${key}`, error);
  }
}

/**
 * Migrate legacy unencrypted key from MMKV into SecureStore and delete it from MMKV
 */
export async function migrateLegacyPlaintextKey(
  legacyKey: string,
  secureKey: SecureStorageKey | string
): Promise<string | null> {
  try {
    const existingSecure = await getSecureItem(secureKey);
    if (existingSecure) {
      // If already stored in SecureStore, clean up legacy plaintext MMKV key if still present
      if (storage.contains(legacyKey)) {
        storage.remove(legacyKey);
      }
      return existingSecure;
    }

    const legacyValue = storage.getString(legacyKey);
    if (legacyValue) {
      await setSecureItem(secureKey, legacyValue);
      storage.remove(legacyKey);
      return legacyValue;
    }
  } catch (error) {
    logger.error(`Failed to migrate legacy key ${legacyKey} to ${secureKey}`, error);
  }

  return null;
}
