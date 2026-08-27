import type {
  KnowledgeItem,
  KnowledgeItemLabelSource,
} from '@glimpse/shared';
import type { KnowledgeLabel as SharedKnowledgeLabel } from '@glimpse/features';

// The taxonomy lives in @glimpse/features so mobile and desktop classify with
// the same label set; the alias keeps the local type name importable.
export type KnowledgeLabel = SharedKnowledgeLabel;

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
