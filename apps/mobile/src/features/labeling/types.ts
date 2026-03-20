import type {
  KnowledgeItem,
  KnowledgeItemLabelSource,
  KnowledgeItemLabelStatus,
} from '@glimpse/shared';
import type { AppError } from '@/src/lib/effect-result';

export const LABEL_TAXONOMY = [
  'todo',
  'idea',
  'reference',
  'learning',
  'work',
  'personal',
  'meeting',
  'project',
  'finance',
  'health',
  'travel',
  'inspiration',
] as const;

export type KnowledgeLabel = (typeof LABEL_TAXONOMY)[number];

export interface LabelingResult {
  labels: KnowledgeLabel[];
  score: number;
  source: KnowledgeItemLabelSource;
  version: string;
}

export interface LabelingJobResult {
  success: true;
  data: {
    processedCount: number;
    items: KnowledgeItem[];
  };
}

export interface LabelingJobFailureResult {
  success: false;
  error: AppError;
}

export type LabelingJobRunResult = LabelingJobResult | LabelingJobFailureResult;

export interface KnowledgeItemLabelSnapshot {
  labels?: string[] | null;
  provisionalLabels?: string[] | null;
  labelStatus?: KnowledgeItemLabelStatus | null;
}
