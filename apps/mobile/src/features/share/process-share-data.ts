import type { KnowledgeItem, KnowledgeItemType } from '@glimpse/shared';

export interface PendingShareData {
  text?: string[];
  webUrl?: { url: string; meta: string }[];
}

export interface ProcessShareDataDeps {
  saveKnowledgeItem: (item: KnowledgeItem) => Promise<KnowledgeItem>;
  generateId: () => string;
  logger?: { info: (message: string, meta?: unknown) => void };
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
 */
export function createProcessShareData(deps: ProcessShareDataDeps) {
  return async function processShareData(data: PendingShareData): Promise<boolean> {
    let saved = false;

    // Process text share
    if (data.text && data.text.length > 0) {
      const combinedText = data.text.join('\n');
      await deps.saveKnowledgeItem(
        createShareItem(deps, { title: null, body: combinedText, url: null }),
      );
      deps.logger?.info('[PendingShareProcessor] Saved text share');
      saved = true;
    }

    // Process URL share
    if (data.webUrl && data.webUrl.length > 0) {
      await Promise.all(
        data.webUrl.map(async (webUrl) => {
          await deps.saveKnowledgeItem(
            createShareItem(deps, {
              title: webUrl.url,
              body: webUrl.meta || null,
              url: webUrl.url,
            }),
          );
          deps.logger?.info('[PendingShareProcessor] Saved URL share:', { url: webUrl.url });
        }),
      );
      saved = true;
    }

    return saved;
  };
}
