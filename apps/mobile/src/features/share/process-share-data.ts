import type { KnowledgeItem, KnowledgeItemType } from '@glimpse/shared';

export interface PendingShareData {
  text?: string[];
  webUrl?: { url: string; meta: string }[];
}

export interface ProcessShareDataResult {
  /** Number of entries persisted successfully during this run. */
  savedCount: number;
  /** Whether the combined text entry was persisted in this run. */
  textSaved: boolean;
  /** URLs persisted successfully during this run (deduped, original order). */
  savedUrls: string[];
  /** URLs that failed to persist; callers must keep them pending. */
  failedUrls: string[];
}

export interface ProcessShareDataDeps {
  saveKnowledgeItem: (item: KnowledgeItem) => Promise<KnowledgeItem>;
  generateId: () => string;
  // LogContext(Record<string, unknown>) 기반 시그니처 — unknown 매개변수는
  // 구체적 콜백(LogContext)과 반공변 충돌을 일으켜 TS6부터 할당이 거부된다.
  logger?: { info: (message: string, context?: Record<string, unknown>) => void };
  now?: () => number;
}

function createShareItem(
  deps: ProcessShareDataDeps,
  fields: { title: string | null; body: string | null; url: string | null },
): KnowledgeItem {
  const now = deps.now?.() ?? Date.now();
  return {
    id: deps.generateId(),
    type: 'share' as KnowledgeItemType,
    title: fields.title,
    body: fields.body,
    url: fields.url,
    summary: null,
    tags: null,
    labels: null,
    provisionalLabels: null,
    labelStatus: 'pending',
    labelSource: null,
    labelVersion: null,
    labelScore: null,
    labelRequestedAt: now,
    labelCompletedAt: null,
    labelError: null,
    createdAt: now,
    updatedAt: now,
    stability: null,
    difficulty: null,
    lastReviewedAt: null,
    nextReviewAt: null,
  };
}

/**
 * Builds share items from pending Share Extension data and saves them,
 * enrolling each item in the labeling queue (labelStatus 'pending').
 *
 * Entries are processed independently: one failure neither aborts the
 * remaining saves nor discards already-saved entries. The per-entry outcome
 * is returned so the caller can shrink the pending store accordingly
 * (idempotent reruns never re-save a persisted entry).
 */
export function createProcessShareData(deps: ProcessShareDataDeps) {
  return async function processShareData(
    data: PendingShareData,
  ): Promise<ProcessShareDataResult> {
    const result: ProcessShareDataResult = {
      savedCount: 0,
      textSaved: false,
      savedUrls: [],
      failedUrls: [],
    };

    // Process text share
    if (data.text && data.text.length > 0) {
      const combinedText = data.text.join('\n');
      try {
        await deps.saveKnowledgeItem(
          createShareItem(deps, { title: null, body: combinedText, url: null }),
        );
        result.savedCount += 1;
        result.textSaved = true;
        deps.logger?.info('[PendingShareProcessor] Saved text share');
      } catch (error) {
        deps.logger?.info('[PendingShareProcessor] Text save failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Process URL shares independently of each other
    if (data.webUrl && data.webUrl.length > 0) {
      await Promise.all(
        data.webUrl.map(async (webUrl) => {
          try {
            await deps.saveKnowledgeItem(
              createShareItem(deps, {
                title: webUrl.url,
                body: webUrl.meta || null,
                url: webUrl.url,
              }),
            );
            result.savedCount += 1;
            result.savedUrls.push(webUrl.url);
            deps.logger?.info('[PendingShareProcessor] Saved URL share:', {
              url: webUrl.url,
            });
          } catch (error) {
            result.failedUrls.push(webUrl.url);
            deps.logger?.info('[PendingShareProcessor] URL save failed', {
              url: webUrl.url,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }),
      );
    }

    return result;
  };
}
