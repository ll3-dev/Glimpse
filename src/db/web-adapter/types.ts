export interface StoredItem {
  id: string;
  type: 'note' | 'link' | 'highlight' | 'screenshot' | 'share';
  title: string | null;
  body: string | null;
  url: string | null;
  summary: string | null;
  tags: string[] | null;
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
