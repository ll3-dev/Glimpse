export interface StoredItem {
  id: string;
  type: 'note' | 'link' | 'highlight' | 'screenshot' | 'share';
  title: string | null;
  body: string | null;
  url: string | null;
  summary: string | null;
  tags: string[] | null;
  labels?: string[] | null;
  provisionalLabels?: string[] | null;
  labelStatus?: string | null;
  labelSource?: string | null;
  labelVersion?: string | null;
  labelScore?: number | null;
  labelRequestedAt?: number | null;
  labelCompletedAt?: number | null;
  labelError?: string | null;
  createdAt: number;
  updatedAt: number;
  stability: number | null;
  difficulty: number | null;
  lastReviewedAt: number | null;
  nextReviewAt: number | null;
}

export type WebQueryMethod = 'run' | 'all' | 'get' | 'values';

export type WebQueryResult = {
  rows: unknown[];
  changes?: number;
  lastInsertRowId?: number;
};
