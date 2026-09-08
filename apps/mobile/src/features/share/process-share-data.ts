import type { KnowledgeItem, KnowledgeItemType } from '@glimpse/shared';

export interface PendingShareData {
  text?: string[];
  webUrl?: { url: string; meta: string }[];
  /** Absolute paths of pending image files written by the Shortcuts intent. */
  imagePaths?: string[];
}

export interface ProcessShareDataResult {
  /** Number of entries persisted successfully during this run. */
  savedCount: number;
  /** Whether the combined text entry was persisted in this run. */
  textSaved: boolean;
  /** URLs persisted successfully in this run (deduped, original order). */
  savedUrls: string[];
  /** URLs that failed to persist; callers must keep them pending. */
  failedUrls: string[];
  /** Image paths persisted successfully in this run (original order). */
  savedImagePaths: string[];
  /** Image paths that failed to persist; callers must keep them pending. */
  failedImagePaths: string[];
}

export interface ProcessShareDataDeps {
  saveKnowledgeItem: (item: KnowledgeItem) => Promise<KnowledgeItem>;
  generateId: () => string;
  /**
   * Optional OCR hook for pending image captures — receives a file URI and
   * returns recognized text or null. Absent/failed OCR still saves the item
   * (today's contract stores OCR text only, never image bytes).
   */
  extractText?: (uri: string) => Promise<string | null>;
  // LogContext(Record<string, unknown>) 기반 시그니처 — unknown 매개변수는
  // 구체적 콜백(LogContext)과 반공변 충돌을 일으켜 TS6부터 할당이 거부된다.
  logger?: { info: (message: string, context?: Record<string, unknown>) => void };
  now?: () => number;
}

function createShareItem(
  deps: ProcessShareDataDeps,
  fields: {
    title: string | null;
    body: string | null;
    url: string | null;
    type?: KnowledgeItemType;
  },
): KnowledgeItem {
  const now = deps.now?.() ?? Date.now();
  return {
    id: deps.generateId(),
    type: fields.type ?? ('share' as KnowledgeItemType),
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
      savedImagePaths: [],
      failedImagePaths: [],
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

    // Process image shares (Shortcuts captures) — OCR text becomes the body;
    // the file path satisfies screenshot validation but is not persisted.
    if (data.imagePaths && data.imagePaths.length > 0) {
      await Promise.all(
        data.imagePaths.map(async (path) => {
          try {
            const text = (await deps.extractText?.(path)) ?? null;
            await deps.saveKnowledgeItem(
              createShareItem(deps, {
                type: 'screenshot',
                title: null,
                body: text,
                url: null,
              }),
            );
            result.savedCount += 1;
            result.savedImagePaths.push(path);
            deps.logger?.info('[PendingShareProcessor] Saved image share', { path });
          } catch (error) {
            result.failedImagePaths.push(path);
            deps.logger?.info('[PendingShareProcessor] Image save failed', {
              path,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }),
      );
    }

    return result;
  };
}
