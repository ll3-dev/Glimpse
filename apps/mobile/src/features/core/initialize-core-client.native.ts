import RNBlobUtil from "react-native-blob-util";
import { Platform } from "react-native";
import { mobileCoreClient } from "./mobile-core-client";
import { getAppGroupContainerPath } from "@/src/utils/app-group-path";
import { logger } from "@/src/utils/logger";

// Legacy path (before App Group migration)
const LEGACY_CORE_DIRECTORY = `${RNBlobUtil.fs.dirs.DocumentDir}/glimpse`;
const LEGACY_DB_PATH = `${LEGACY_CORE_DIRECTORY}/glimpse.sqlite`;

let initializationPromise: Promise<string> | null = null;

/**
 * Migrates the database from legacy DocumentDir to App Group container.
 * This allows both the main app and share extension to access the same DB.
 */
async function migrateToAppGroup(appGroupPath: string): Promise<void> {
  const newDbPath = `${appGroupPath}/glimpse.sqlite`;
  const [legacyDbExists, newDbExists] = await Promise.all([
    RNBlobUtil.fs.exists(LEGACY_DB_PATH),
    RNBlobUtil.fs.exists(newDbPath),
  ]);

  if (legacyDbExists && !newDbExists) {
    logger.info("Migrating database from DocumentDir to App Group container...");

    // Copy the database file
    await RNBlobUtil.fs.cp(LEGACY_DB_PATH, newDbPath);

    // Verify the copy succeeded
    const newDbExistsAfterCopy = await RNBlobUtil.fs.exists(newDbPath);
    if (!newDbExistsAfterCopy) {
      throw new Error("Database migration failed: copy did not succeed");
    }

    // Remove the old database (keep the directory for other files)
    await RNBlobUtil.fs.unlink(LEGACY_DB_PATH);

    logger.info("Database migration completed successfully");
  }
}

/**
 * Gets the database path, preferring App Group container on iOS.
 */
async function getDbPath(): Promise<string> {
  // On iOS, use App Group container for shared access with Share Extension
  if (Platform.OS === "ios") {
    const appGroupPath = await getAppGroupContainerPath();

    if (appGroupPath) {
      // Migrate existing database if needed
      await migrateToAppGroup(appGroupPath);
      return `${appGroupPath}/glimpse.sqlite`;
    }

    // Fallback to DocumentDir if App Group is not available
    logger.warn(
      "App Group container not available, falling back to DocumentDir"
    );
  }

  // Android or iOS fallback: use DocumentDir
  const directoryExists = await RNBlobUtil.fs.isDir(LEGACY_CORE_DIRECTORY);
  if (!directoryExists) {
    await RNBlobUtil.fs.mkdir(LEGACY_CORE_DIRECTORY);
  }

  return LEGACY_DB_PATH;
}

export function initializeCoreClient(): Promise<string> {
  if (initializationPromise) {
    return initializationPromise;
  }

  const promise = (async () => {
    const dbPath = await getDbPath();
    await mobileCoreClient.initialize(dbPath);
    logger.info(`Core client initialized with DB at: ${dbPath}`);
    return dbPath;
  })();

  // 실패한 초기화는 캐시하지 않는다 — 루트 폴백의 "다시 시도"가
  // 실제 재초기화를 수행해야 한다. (거부 재발생은 반환값이 담당)
  initializationPromise = promise;
  promise.catch(() => {
    if (initializationPromise === promise) {
      initializationPromise = null;
    }
  });

  return promise;
}

/**
 * Returns the current database path without initializing.
 * Useful for Share Extension to know where the DB is.
 */
export async function getCoreDbPath(): Promise<string> {
  if (Platform.OS === "ios") {
    const appGroupPath = await getAppGroupContainerPath();
    if (appGroupPath) {
      return `${appGroupPath}/glimpse.sqlite`;
    }
  }
  return LEGACY_DB_PATH;
}
