import type {
  KnowledgeItem,
  KnowledgeItemLabelSource,
  KnowledgeItemLabelStatus,
} from '@glimpse/shared';

const LABEL_TAXONOMY = [
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
  error: string;
}

export type LabelingJobRunResult = LabelingJobResult | LabelingJobFailureResult;
