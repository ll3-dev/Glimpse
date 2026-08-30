/**
 * Processes pending share items saved by the Share Extension.
 *
 * When direct save is enabled, the Share Extension saves data to UserDefaults
 * without opening the app. This module processes those items on app launch.
 *
 * The batch logic lives in process-pending-batch (pure core); this file only
 * wires it to react-native lifecycle, the native store module and the core
 * client.
 *
 * Processing is idempotent: every entry that is saved to the database is
 * removed from the pending store immediately, so a partially-failed batch
 * keeps only its unsaved entries and a foreground rerun never re-saves
 * already-persisted items (previously the whole batch was retried with fresh
 * ids, duplicating shares on every app foreground).
 */

import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { mobileCoreClient } from "@/src/features/core/mobile-core-client";
import { logger } from "@/src/utils/logger";
import {
  getPendingShareData,
  clearPendingShareData,
} from "@/src/utils/app-group-path";
import {
  clearPendingShareText,
  removePendingShareUrls,
} from "./pending-share-store";
import { generateId } from "@/src/lib/id";
import { processPendingBatch } from "./process-pending-batch";

export type { PendingShareData } from "./process-share-data";

let isProcessing = false;

const batchDeps = {
  saveKnowledgeItem: (item: Parameters<typeof mobileCoreClient.saveKnowledgeItem>[0]) =>
    mobileCoreClient.saveKnowledgeItem(item),
  generateId,
  getPendingShareData,
  clearPendingShareData,
  clearPendingShareText,
  removePendingShareUrls,
  logger,
};

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
        await processPendingBatch(batchDeps);
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
