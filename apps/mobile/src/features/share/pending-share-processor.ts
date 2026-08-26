/**
 * Processes pending share items saved by the Share Extension.
 *
 * When direct save is enabled, the Share Extension saves data to UserDefaults
 * without opening the app. This module processes those items on app launch.
 */

import { useEffect } from "react";
import { AppState, Platform, AppStateStatus } from "react-native";
import { mobileCoreClient } from "@/src/features/core/mobile-core-client";
import { logger } from "@/src/utils/logger";
import { getPendingShareData, clearPendingShareData } from "@/src/utils/app-group-path";
import { generateId } from "@/src/lib/id";
import { createProcessShareData, type PendingShareData } from "./process-share-data";

export type { PendingShareData } from "./process-share-data";

let isProcessing = false;

/**
 * Processes pending share data and saves to the database.
 */
async function processShareData(data: PendingShareData): Promise<boolean> {
  try {
    return await createProcessShareData({
      saveKnowledgeItem: (item) => mobileCoreClient.saveKnowledgeItem(item),
      generateId,
      logger,
    })(data);
  } catch (error) {
    logger.error("[PendingShareProcessor] Failed to process share data:", error);
    return false;
  }
}

/**
 * Hook to process pending shares when the app becomes active.
 *
 * This is used when direct save is enabled in the Share Extension.
 * The extension saves data to UserDefaults without opening the app,
 * and this hook processes that data when the user next opens the app.
 */
export function useProcessPendingShares() {
  useEffect(() => {
    const processPending = async () => {
      if (isProcessing) return;
      isProcessing = true;

      try {
        const data = await getPendingShareData();
        if (data) {
          logger.info("[PendingShareProcessor] Found pending share data, processing...");
          const success = await processShareData(data);
          if (success) {
            await clearPendingShareData();
            logger.info("[PendingShareProcessor] Pending share data processed and cleared");
          }
        }
      } catch (error) {
        logger.error("[PendingShareProcessor] Error processing pending shares:", error);
      } finally {
        isProcessing = false;
      }
    };

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        await processPending();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    // Process on mount
    processPending();

    return () => {
      subscription.remove();
    };
  }, []);
}

/**
 * Processes any pending shares immediately.
 * Call this when you want to ensure all pending shares are processed.
 */
export async function processPendingSharesNow(): Promise<number> {
  if (Platform.OS !== "ios") {
    return 0;
  }

  try {
    const data = await getPendingShareData();
    if (data) {
      const success = await processShareData(data);
      if (success) {
        await clearPendingShareData();
        return 1;
      }
    }
    return 0;
  } catch (error) {
    logger.error("[PendingShareProcessor] Error in processPendingSharesNow:", error);
    return 0;
  }
}
