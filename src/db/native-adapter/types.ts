export type NativeQueryRow = Record<string, string | number | boolean | ArrayBuffer | null>;
export type NativeQueryMetadata = Record<string, { name: string; index: number }>;

export type NitroQueryMethod = 'run' | 'all' | 'get' | 'values';

export type NitroQueryResult = {
  rows: unknown[];
  changes?: number;
  lastInsertRowId?: number;
};
