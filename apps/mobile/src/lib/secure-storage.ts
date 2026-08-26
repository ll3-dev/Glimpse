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
  SYNC_PAIRING_TOKEN: 'glimpse_secure_sync_pairing_token',
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
      if (Platform.OS === 'web') {
        return null;
      }
      throw new Error('Secure storage is unavailable on this device.');
    }

    const value = await SecureStore.getItemAsync(key, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    memoryCache.set(key, value ?? null);
    return value ?? null;
  } catch (error) {
    logger.error(`Failed to get secure item for key: ${key}`, error);
    throw error;
  }
}

/**
 * Set item securely in Keychain / Keystore
 */
export async function setSecureItem(
  key: SecureStorageKey | string,
  value: string
): Promise<void> {
  try {
    const available = await isSecureStoreAvailable();
    if (!available) {
      if (Platform.OS === 'web') {
        memoryCache.set(key, value);
        return;
      }
      throw new Error('Secure storage is unavailable on this device.');
    }

    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    memoryCache.set(key, value);
  } catch (error) {
    logger.error(`Failed to set secure item for key: ${key}`, error);
    throw error;
  }
}

/**
 * Delete item securely from Keychain / Keystore
 */
export async function deleteSecureItem(key: SecureStorageKey | string): Promise<void> {
  try {
    const available = await isSecureStoreAvailable();
    if (!available) {
      if (Platform.OS === 'web') {
        memoryCache.delete(key);
        return;
      }
      throw new Error('Secure storage is unavailable on this device.');
    }

    await SecureStore.deleteItemAsync(key, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    memoryCache.delete(key);
  } catch (error) {
    logger.error(`Failed to delete secure item for key: ${key}`, error);
    throw error;
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
    throw error;
  }
}
