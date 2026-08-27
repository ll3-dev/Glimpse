import type { KnowledgeItem } from '@glimpse/shared';
import type { KnowledgeItemInput, MetadataInput, SaveKnowledgeItemDeps, SaveResult } from './types';
import { validateInput } from './validation';

function assertNever(value: never): never {
  throw new Error(`Unknown input type: ${JSON.stringify((value as KnowledgeItemInput).type)}`);
}
function mapToMetadataInput(input: KnowledgeItemInput): MetadataInput {
  switch (input.type) {
    case 'note': return { content: input.body, title: input.title ?? undefined, type: 'note' };
    case 'link':
      return { content: input.body ?? input.url, title: input.title ?? undefined, type: 'link' };
    case 'highlight':
      return { content: input.text ?? input.body ?? '', title: input.title ?? undefined, type: 'highlight' };
    case 'screenshot':
      return { content: input.body ?? '', title: input.title ?? undefined, type: 'screenshot' };
    case 'share':
      return { content: input.body ?? input.url ?? '', title: input.title ?? undefined, type: 'share' };
    default: return assertNever(input);
  }
}

function resolveBodyValue(input: KnowledgeItemInput): string | null {
  switch (input.type) {
    case 'note': return input.body;
    case 'link':
    case 'share': return input.body ?? null;
    case 'highlight': return input.text ?? input.body ?? null;
    case 'screenshot': return input.body ?? null;
    default: return null;
  }
}

function resolveUrlValue(input: KnowledgeItemInput): string | null {
  switch (input.type) {
    case 'link':
    case 'share': return input.url ?? null;
    case 'highlight': return input.sourceUrl ?? null;
    case 'note':
    case 'screenshot': return null;
    default: return null;
  }
}

export function createSaveKnowledgeItem(deps: SaveKnowledgeItemDeps) {
  return async (input: KnowledgeItemInput): Promise<SaveResult> => {
    const validationErrors = validateInput(input);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: validationErrors.map((e) => e.message).join(', ') },
      };
    }

    try {
      const metadata = await deps.generateMetadata(mapToMetadataInput(input));
      const now = Date.now();
      const reviewSchedule = await deps.initializeReviewSchedule(now);
      let retries = 0;
      while (retries < deps.maxIdCollisionRetries) {
        const item: KnowledgeItem = {
          id: deps.generateId(),
          type: input.type,
          title: input.title ?? null,
          body: resolveBodyValue(input) ?? metadata.summary,
          url: resolveUrlValue(input),
          summary: metadata.summary,
          tags: input.tags ?? metadata.tags,
          labels: null, provisionalLabels: null, labelStatus: 'pending', labelSource: null,
          labelVersion: null, labelScore: null, labelRequestedAt: now,
          labelCompletedAt: null, labelError: null,
          createdAt: now, updatedAt: now,
          stability: reviewSchedule.stability,
          difficulty: reviewSchedule.difficulty,
          lastReviewedAt: reviewSchedule.lastReviewedAt,
          nextReviewAt: reviewSchedule.nextReviewAt,
        };
        try {
          return { success: true, item: await deps.coreClient.saveKnowledgeItem(item) };
        } catch (error) {
          if (deps.isIdCollisionError(error)) {
            retries += 1;
            continue;
          }
          throw error;
        }
      }
      return {
        success: false,
        error: { code: 'MAX_RETRIES_EXCEEDED', message: 'Max ID collision retries exceeded' },
      };
    } catch (error) {
      deps.logger.error('Failed to save knowledge item', { error, input });
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: String(error) } };
    }
  };
}
