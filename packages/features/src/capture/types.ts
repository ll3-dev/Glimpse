import type { KnowledgeItem, InitializeReviewScheduleOutput } from '@glimpse/shared';

export type KnowledgeItemType = 'note' | 'link' | 'highlight' | 'screenshot' | 'share';

export interface NoteInput {
  type: 'note'; title?: string | null; body: string; tags?: string[] | null;
}
export interface LinkInput {
  type: 'link'; url: string; title?: string | null; body?: string | null; tags?: string[] | null;
}
export interface HighlightInput {
  type: 'highlight'; text?: string | null; sourceUrl?: string | null;
  title?: string | null; tags?: string[] | null; body?: string | null;
}
export interface ScreenshotInput {
  type: 'screenshot'; imageData?: string | null; title?: string | null;
  tags?: string[] | null; body?: string | null;
}
export interface ShareInput {
  type: 'share'; url?: string | null; title?: string | null;
  body?: string | null; tags?: string[] | null;
}
export type KnowledgeItemInput = NoteInput | LinkInput | HighlightInput | ScreenshotInput | ShareInput;

export interface GenerateMetadata { summary: string; tags: string[]; }
export interface MetadataInput { content: string; title?: string; type?: KnowledgeItemType; }

export interface SaveKnowledgeItemDeps {
  coreClient: { saveKnowledgeItem: (item: KnowledgeItem) => Promise<KnowledgeItem> };
  generateMetadata: (input: MetadataInput) => Promise<GenerateMetadata>;
  initializeReviewSchedule: (createdAt: number) => Promise<InitializeReviewScheduleOutput>;
  logger: { error: (message: string, meta?: unknown) => void };
  generateId: () => string;
  isIdCollisionError: (error: unknown) => boolean;
  maxIdCollisionRetries: number;
}

export interface SaveSuccessResult { success: true; item: KnowledgeItem; }
export interface SaveFailureResult {
  success: false;
  error: { code: string; message: string };
}
export type SaveResult = SaveSuccessResult | SaveFailureResult;
export interface ValidationError { field: string; message: string; }
