import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { storage, StorageKeys } from '@/src/lib/storage';

/**
 * Semantic rerank (mobile) settings — 온디바이스 임베딩 opt-in.
 *
 * 기본 OFF(옵트인). ON + 기기 내 nomic 모델 다운로드 완료 시 llama.rn으로
 * 기기 내부에서만 임베딩해 재정렬한다 — 외부 전송은 없다.
 */

export const SEMANTIC_RERANK_ENABLED_KEY = StorageKeys.SEMANTIC_RERANK_ENABLED;

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
