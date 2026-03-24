import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { storage, StorageKeys } from '@/src/lib/storage';
import {
  APPLE_TARGET_ID,
  createBYOKTargetId,
  createLocalTargetId,
  RULES_TARGET_ID,
  STUB_TARGET_ID,
  type AIFeature,
  type AITargetId,
  type AITargetSettings,
} from '@/src/features/ai/targets/types';
import { getBYOKStoreConfig } from './byok.store';
import { getLocalLLMStoreConfig } from './local-llm.store';
import { isAppleIntelligenceEnabled } from '@/src/features/settings/appleIntelligenceToggle';

type AITargetSettingsStoreState = {
  settings: AITargetSettings;
  actions: {
    setDefaultTargetId: (targetId: AITargetId) => void;
    setFeatureTargetId: (feature: Exclude<AIFeature, 'labeling'>, targetId: AITargetId | null) => void;
    setLabelingTargetId: (targetId: AITargetId) => void;
    reset: () => void;
  };
};

function migrateInitialTargetSettings(): AITargetSettings {
  const persistedDefaultTarget = storage.getString(StorageKeys.AI_DEFAULT_TARGET) ?? null;
  const persistedMetadataTarget = storage.getString(StorageKeys.AI_METADATA_TARGET) ?? null;
  const persistedLabelingTarget = storage.getString(StorageKeys.AI_LABELING_TARGET) ?? null;
  const persistedChatTarget = storage.getString(StorageKeys.AI_CHAT_TARGET) ?? null;

  if (persistedDefaultTarget || persistedMetadataTarget || persistedLabelingTarget || persistedChatTarget) {
    return {
      defaultTargetId: persistedDefaultTarget ?? STUB_TARGET_ID,
      metadataTargetId: persistedMetadataTarget,
      labelingTargetId: persistedLabelingTarget ?? RULES_TARGET_ID,
      chatTargetId: persistedChatTarget,
    };
  }

  const byokConfig = getBYOKStoreConfig();
  const localConfig = getLocalLLMStoreConfig();
  const appleEnabled = isAppleIntelligenceEnabled();

  let defaultTargetId = STUB_TARGET_ID;

  if (appleEnabled) {
    defaultTargetId = APPLE_TARGET_ID;
  } else if (localConfig.enabled && localConfig.selectedModelId) {
    defaultTargetId = createLocalTargetId(localConfig.selectedModelId);
  } else if (
    byokConfig.enabled &&
    byokConfig.provider &&
    byokConfig.model
  ) {
    defaultTargetId = createBYOKTargetId(byokConfig.provider, byokConfig.model);
  }

  return {
    defaultTargetId,
    metadataTargetId: null,
    labelingTargetId: RULES_TARGET_ID,
    chatTargetId: null,
  };
}

function persistSettings(settings: AITargetSettings): void {
  storage.set(StorageKeys.AI_DEFAULT_TARGET, settings.defaultTargetId);
  if (settings.metadataTargetId) {
    storage.set(StorageKeys.AI_METADATA_TARGET, settings.metadataTargetId);
  } else {
    storage.remove(StorageKeys.AI_METADATA_TARGET);
  }
  storage.set(StorageKeys.AI_LABELING_TARGET, settings.labelingTargetId);
  if (settings.chatTargetId) {
    storage.set(StorageKeys.AI_CHAT_TARGET, settings.chatTargetId);
  } else {
    storage.remove(StorageKeys.AI_CHAT_TARGET);
  }
}

const initialSettings = migrateInitialTargetSettings();

const aiTargetSettingsStore = createStore<AITargetSettingsStoreState>((set) => ({
  settings: initialSettings,
  actions: {
    setDefaultTargetId: (targetId) => {
      set((state) => {
        const next = { ...state.settings, defaultTargetId: targetId };
        persistSettings(next);
        return { settings: next };
      });
    },
    setFeatureTargetId: (feature, targetId) => {
      set((state) => {
        const next = {
          ...state.settings,
          [feature === 'metadata' ? 'metadataTargetId' : 'chatTargetId']: targetId,
        } as AITargetSettings;
        persistSettings(next);
        return { settings: next };
      });
    },
    setLabelingTargetId: (targetId) => {
      set((state) => {
        const next = { ...state.settings, labelingTargetId: targetId };
        persistSettings(next);
        return { settings: next };
      });
    },
    reset: () => {
      persistSettings(initialSettings);
      set({ settings: initialSettings });
    },
  },
}));

export function getAITargetSettings(): AITargetSettings {
  return aiTargetSettingsStore.getState().settings;
}

export function useAITargetSettings<T>(selector: (settings: AITargetSettings) => T): T {
  return useStore(aiTargetSettingsStore, (state) => selector(state.settings));
}

export function setDefaultAITargetId(targetId: AITargetId): void {
  aiTargetSettingsStore.getState().actions.setDefaultTargetId(targetId);
}

export function setMetadataAITargetId(targetId: AITargetId | null): void {
  aiTargetSettingsStore.getState().actions.setFeatureTargetId('metadata', targetId);
}

export function setChatAITargetId(targetId: AITargetId | null): void {
  aiTargetSettingsStore.getState().actions.setFeatureTargetId('chat', targetId);
}

export function setLabelingAITargetId(targetId: AITargetId): void {
  aiTargetSettingsStore.getState().actions.setLabelingTargetId(targetId);
}

export function resetAITargetSettings(): void {
  aiTargetSettingsStore.getState().actions.reset();
}
