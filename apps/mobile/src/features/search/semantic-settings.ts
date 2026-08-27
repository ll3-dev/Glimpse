import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { storage, StorageKeys } from '@/src/lib/storage';

/**
 * Semantic rerank (mobile) settings — BYOK embedding opt-in.
 *
 * 기본 OFF(옵트인). ON이면 검색어와 선택 항목 내용(제목/요약/본문 발췌)이
 * 사용자가 설정한 openai-compatible embedding API로 전송된다 — 설정 UI에는
 * 프라이버시 문구가 반드시 함께 노출된다.
 */

export const SEMANTIC_RERANK_ENABLED_KEY = StorageKeys.SEMANTIC_RERANK_ENABLED;
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

interface SemanticSettingsState {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
}

function getSemanticRerankEnabled(): boolean {
  return storage.getBoolean(SEMANTIC_RERANK_ENABLED_KEY) ?? false;
}

const semanticSettingsStore = createStore<SemanticSettingsState>((set) => ({
  enabled: getSemanticRerankEnabled(),
  setEnabled: (value) => {
    storage.set(SEMANTIC_RERANK_ENABLED_KEY, value);
    set({ enabled: value });
  },
}));

/** 설정 화면과 라이브러리 화면이 공유하는 옵트인 플래그 구독. */
export function useSemanticRerankEnabled(): [boolean, (value: boolean) => void] {
  const enabled = useStore(semanticSettingsStore, (state) => state.enabled);
  const setEnabled = useStore(semanticSettingsStore, (state) => state.setEnabled);
  return [enabled, setEnabled];
}
