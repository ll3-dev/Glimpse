/**
 * Chat RAG 지속 임베딩 인덱스 — 항목 텍스트 해시당 벡터를 저장해 채팅
 * 메시지마다 라이브러리 전체를 재임베딩하지 않게 한다.
 *
 * 저장은 데스크톱 설정·그래프 지표와 같은 localStorage 단일 경로를 따른다.
 * 벡터는 소수 4자리로 반올림해 저장한다 — 단위 벡터 기준 코사인 유사도
 * 오차가 1e-3 수준으로 RAG_SIMILARITY_THRESHOLD(0.55) 판정에 영향이 없다.
 *
 * 모델이 바뀌면(임베딩 GGUF 교체) 의미 공간이 달라져 섞을 수 없으므로
 * 인덱스 전체를 폐기하고 처음부터 다시 모은다.
 */

export interface EmbeddingIndexEntry {
  /** 항목 텍스트(itemEmbeddingText)의 해시 — 텍스트가 바뀌면 재임베딩 대상 */
  h: string;
  /** 소수 4자리로 반올림된 벡터 */
  v: number[];
  /** 캐시 기록 시각 — 용량 초과 시 가장 오래된 것부터 방출한다 */
  t: number;
}

export interface EmbeddingIndex {
  version: 1;
  /** 이 인덱스를 만든 임베딩 모델 id */
  modelId: string;
  entries: Record<string, EmbeddingIndexEntry>;
}

/** localStorage 할당 폭주를 막는 상한 — 초과분은 가장 오래된 캐시부터 방출 */
export const EMBEDDING_INDEX_MAX_ENTRIES = 1000;
export const EMBEDDING_INDEX_STORAGE_KEY = 'glimpse_chat_embedding_index_v1';

/** FNV-1a 32비트 + 텍스트 길이 접미 — 임베딩 텍스트 변경 감지용 경량 해시 */
export function hashItemText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(16)}:${text.length}`;
}

export function createEmptyEmbeddingIndex(modelId: string): EmbeddingIndex {
  return { version: 1, modelId, entries: {} };
}

export interface IndexedItemText {
  id: string;
  text: string;
}

export interface IndexWorkPlan {
  /** 캐시가 유효한 항목 — 재임베딩 없이 랭킹에 쓴다 */
  fresh: Map<string, readonly number[]>;
  /** 캐시가 없거나 텍스트가 바뀐 항목 — 임베딩 배치에 실린다 */
  stale: IndexedItemText[];
}

/**
 * 캐시 적중/부재를 가른다. 저장된 인덱스가 없거나 손상됐으면 전부 stale.
 * 인덱스 모델과 요청 모델이 다르면 의미 공간이 다르므로 전부 stale.
 */
export function planIndexWork(
  index: EmbeddingIndex | null,
  modelId: string,
  items: IndexedItemText[],
): IndexWorkPlan {
  const fresh = new Map<string, readonly number[]>();
  const stale: IndexedItemText[] = [];
  if (!index || index.modelId !== modelId) {
    return { fresh, stale: [...items] };
  }
  for (const item of items) {
    const entry = index.entries[item.id];
    if (entry && entry.h === hashItemText(item.text)) fresh.set(item.id, entry.v);
    else stale.push(item);
  }
  return { fresh, stale };
}

function roundVector(vector: readonly number[]): number[] {
  return vector.map((component) => Math.round(component * 10_000) / 10_000);
}

export interface EmbeddedItemText extends IndexedItemText {
  vector: readonly number[];
}

/**
 * 새 벡터를 반영해 다음 인덱스를 만든다. 라이브러리에서 사라진 항목은
 * 프룬하고, 상한 초과분은 기록 시각이 가장 오래된 순으로 방출한다.
 */
export function applyIndexWork(
  index: EmbeddingIndex | null,
  modelId: string,
  libraryIds: ReadonlySet<string>,
  embedded: EmbeddedItemText[],
  now: number,
): EmbeddingIndex {
  const base = index && index.modelId === modelId ? index : createEmptyEmbeddingIndex(modelId);
  const entries: Record<string, EmbeddingIndexEntry> = {};
  // 프룬 — 라이브러리에 남아 있는 항목만 이어받는다.
  for (const [id, entry] of Object.entries(base.entries)) {
    if (libraryIds.has(id)) entries[id] = entry;
  }
  for (const item of embedded) {
    entries[item.id] = { h: hashItemText(item.text), v: roundVector(item.vector), t: now };
  }

  const all = Object.entries(entries);
  if (all.length > EMBEDDING_INDEX_MAX_ENTRIES) {
    all.sort((left, right) => left[1].t - right[1].t);
    for (const [id] of all.slice(0, all.length - EMBEDDING_INDEX_MAX_ENTRIES)) {
      delete entries[id];
    }
  }
  return { version: 1, modelId, entries };
}

export interface EmbeddingIndexStore {
  load(): EmbeddingIndex | null;
  save(index: EmbeddingIndex): void;
}

/** 저장소 부재·손상은 모두 "캐시 없음"으로 수렴한다 — 채팅은 캐시 없이도 동작. */
function sanitizeIndex(raw: unknown): EmbeddingIndex | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<EmbeddingIndex>;
  if (candidate.version !== 1 || typeof candidate.modelId !== 'string') return null;
  if (!candidate.entries || typeof candidate.entries !== 'object') return null;
  const entries: Record<string, EmbeddingIndexEntry> = {};
  for (const [id, entry] of Object.entries(candidate.entries)) {
    if (!entry || typeof entry !== 'object') continue;
    if (typeof entry.h !== 'string' || !Array.isArray(entry.v)) continue;
    if (entry.v.some((component) => typeof component !== 'number' || !Number.isFinite(component))) {
      continue;
    }
    entries[id] = { h: entry.h, v: entry.v, t: typeof entry.t === 'number' ? entry.t : 0 };
  }
  return { version: 1, modelId: candidate.modelId, entries };
}

/** 데스크톱 기본 저장소 — 설정·그래프 지표와 같은 localStorage 경로. */
export function createLocalStorageEmbeddingIndexStore(): EmbeddingIndexStore {
  return {
    load() {
      try {
        const raw = localStorage.getItem(EMBEDDING_INDEX_STORAGE_KEY);
        if (!raw) return null;
        return sanitizeIndex(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    save(index) {
      const payload = JSON.stringify(index);
      try {
        localStorage.setItem(EMBEDDING_INDEX_STORAGE_KEY, payload);
      } catch {
        // 할당 초과 — 가장 오래된 절반을 방출하고 한 번만 재시도한다.
        try {
          const trimmed = applyIndexWork(
            index,
            index.modelId,
            new Set(Object.keys(index.entries)),
            [],
            0,
          );
          localStorage.setItem(
            EMBEDDING_INDEX_STORAGE_KEY,
            JSON.stringify(trimEntriesToHalf(trimmed)),
          );
        } catch {
          // 재시도도 실패 — 이번 세션은 메모리 캐시로만 동작한다.
        }
      }
    },
  };
}

function trimEntriesToHalf(index: EmbeddingIndex): EmbeddingIndex {
  const all = Object.entries(index.entries).sort((left, right) => left[1].t - right[1].t);
  const keep = new Set(all.slice(Math.floor(all.length / 2)).map(([id]) => id));
  const entries: Record<string, EmbeddingIndexEntry> = {};
  for (const [id, entry] of all) {
    if (keep.has(id)) entries[id] = entry;
  }
  return { ...index, entries };
}

/** 테스트용 메모리 저장소 — 저장 실패 시나리오도 failNextSave로 흉내 낸다. */
export function createMemoryEmbeddingIndexStore(
  initial: EmbeddingIndex | null = null,
): EmbeddingIndexStore & { failNextSave: () => void } {
  let state = initial;
  let failNext = false;
  return {
    load() {
      return state;
    },
    save(index) {
      if (failNext) {
        failNext = false;
        throw new Error('quota exceeded');
      }
      state = index;
    },
    failNextSave() {
      failNext = true;
    },
  };
}
