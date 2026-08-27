/**
 * Pure orchestration for processing one pending share batch.
 *
 * Extracted from pending-share-processor so the idempotency logic can be
 * tested (and reused) without loading react-native: every entry that is
 * saved is dropped from the store immediately via partial-update callbacks,
 * and a full clear happens only when the whole batch succeeded.
 */

import type { KnowledgeItem } from '@glimpse/shared';
import type { PendingShareData } from "./process-share-data";
import { createProcessShareData } from "./process-share-data";
import { generateId as defaultGenerateId } from "@/src/lib/id";

export interface ProcessPendingBatchDeps {
  saveKnowledgeItem: (item: KnowledgeItem) => Promise<KnowledgeItem>;
  generateId?: () => string;
  getPendingShareData: () => Promise<PendingShareData | null>;
  clearPendingShareData: () => Promise<void>;
  clearPendingShareText: () => Promise<void>;
  removePendingShareUrls: (urls: string[]) => Promise<void>;
  // LogContext(Record<string, unknown>) 기반 시그니처 — unknown 매개변수는
  // 구체적 콜백(LogContext)과 반공변 충돌을 일으켜 TS6부터 할당이 거부된다.
  logger?: {
    info: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, context?: Record<string, unknown>) => void;
  };
}

/**
 * Processes all currently pending entries.
 * Returns 1 only when every pending entry was saved (the caller then knows
 * the batch finished); failed entries stay pending for the next run.
 */
export async function processPendingBatch(
  deps: ProcessPendingBatchDeps,
): Promise<number> {
  try {
    const data = await deps.getPendingShareData();
    if (!data) {
      return 0;
    }

    const result = await createProcessShareData({
      saveKnowledgeItem: deps.saveKnowledgeItem,
      generateId: deps.generateId ?? defaultGenerateId,
      logger: deps.logger,
    })(data);

    // Drop successfully saved entries right away so reruns skip them.
    if (result.textSaved) {
      await deps.clearPendingShareText();
    }
    if (result.savedUrls.length > 0) {
      await deps.removePendingShareUrls(result.savedUrls);
    }

    const allSaved =
      result.failedUrls.length === 0 && (!data.text || result.textSaved);
    if (!allSaved) {
      return 0;
    }

    // Every entry was persisted and already dropped individually; finish
    // with the full clear so no stale records remain.
    await deps.clearPendingShareData();
    return 1;
  } catch (error) {
    deps.logger?.error?.(
      "[PendingShareProcessor] Failed to process share data:",
      { error },
    );
    return 0;
  }
}
