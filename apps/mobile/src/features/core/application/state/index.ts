/**
 * Local LLM Configuration Types and State Snapshots
 * Migrated from @glimpse/core/application/state
 */

import type { InferenceMode } from '@glimpse/shared';

// ============================================================================
// Local LLM Types
// ============================================================================

export type LocalLLMModelFamily = 'llama' | 'mistral' | 'phi' | 'qwen' | 'qwen-chatml' | 'generic-instruct';

export interface DownloadProgress {
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type DownloadStatus = 'idle' | 'downloading' | 'completed' | 'error';

export interface LocalModel {
  id: string;
  family: LocalLLMModelFamily;
  name: string;
  size: number;
  downloaded: boolean;
  path?: string | null;
  downloadProgress?: DownloadProgress | null;
  loadProgress?: LoadProgress | null;
  loading?: boolean;
  loadError?: string | null;
  downloadError?: string | null;
  downloadCompletionHandled?: boolean;
  sourceRoute?: string | null;
  isReady?: boolean;
}

export interface LocalLLMConfig {
  enabled: boolean;
  selectedModelId: string | null;
  models: LocalModel[];
  bannerDismissed: boolean;
  // Additional fields expected by the existing code
  availableModels: LocalModel[];
  downloadStatus: DownloadStatus;
  downloadProgress: DownloadProgress | null;
  downloadError: string | null;
  downloadingModelId: string | null;
  lastCompletedModelId: string | null;
  downloadCompletionHandled: boolean;
  isBannerDismissed: boolean;
  isLoading: boolean;
  loadProgress: LoadProgress | null;
  loadError: string | null;
}

export interface LocalLLMStoreState {
  config: LocalLLMConfig;
  actions: {
    updateConfig: (updater: (config: LocalLLMConfig) => LocalLLMConfig) => void;
    resetConfig: () => void;
  };
}

// ============================================================================
// Local LLM State Snapshots
// ============================================================================

export function createLocalLLMConfigSnapshot(persisted: {
  enabled: boolean;
  selectedModelId: string | null;
}): LocalLLMConfig {
  return {
    enabled: persisted.enabled,
    selectedModelId: persisted.selectedModelId,
    models: [],
    bannerDismissed: false,
    availableModels: [],
    downloadStatus: 'idle',
    downloadProgress: null,
    downloadError: null,
    downloadingModelId: null,
    lastCompletedModelId: null,
    downloadCompletionHandled: false,
    isBannerDismissed: false,
    isLoading: false,
    loadProgress: null,
    loadError: null,
  };
}

export function resetLocalLLMConfigSnapshot(persisted: {
  enabled: boolean;
  selectedModelId: string | null;
}): LocalLLMConfig {
  return createLocalLLMConfigSnapshot(persisted);
}

export function updateLocalLLMConfigSnapshot(
  _state: LocalLLMStoreState,
  updater: (config: LocalLLMConfig) => LocalLLMConfig
): Partial<LocalLLMStoreState> {
  return { config: updater(_state.config) };
}

export function setLocalLLMEnabledSnapshot(config: LocalLLMConfig, enabled: boolean): LocalLLMConfig {
  return { ...config, enabled };
}

export function selectLocalLLMModelSnapshot(config: LocalLLMConfig, modelId: string | null): LocalLLMConfig {
  return { ...config, selectedModelId: modelId };
}

export function addLocalLLMModelSnapshot(config: LocalLLMConfig, model: LocalModel): LocalLLMConfig {
  const models = [...config.models, model];
  return { ...config, models, availableModels: models };
}

export function removeLocalLLMModelSnapshot(config: LocalLLMConfig, modelId: string): LocalLLMConfig {
  const models = config.models.filter((m) => m.id !== modelId);
  return { ...config, models, availableModels: models };
}

export function updateLocalLLMModelSnapshot(
  config: LocalLLMConfig,
  modelId: string,
  updates: Partial<LocalModel>
): LocalLLMConfig {
  const models = config.models.map((m) => (m.id === modelId ? { ...m, ...updates } : m));
  return { ...config, models, availableModels: models };
}

export function setAvailableLocalLLMModelsSnapshot(config: LocalLLMConfig, models: LocalModel[]): LocalLLMConfig {
  return { ...config, models, availableModels: models };
}

export function startLocalLLMDownloadSnapshot(
  config: LocalLLMConfig,
  modelId: string,
  sourceRoute?: string | null
): LocalLLMConfig {
  const updated = updateLocalLLMModelSnapshot(config, modelId, {
    downloadProgress: { bytesReceived: 0, totalBytes: 0, percentage: 0 },
    downloadError: null,
    sourceRoute: sourceRoute ?? null,
  });
  return {
    ...updated,
    downloadStatus: 'downloading',
    downloadingModelId: modelId,
    downloadProgress: { bytesReceived: 0, totalBytes: 0, percentage: 0 },
  };
}

export function updateLocalLLMDownloadProgressSnapshot(
  config: LocalLLMConfig,
  progress: DownloadProgress
): LocalLLMConfig {
  const modelId = config.downloadingModelId;
  if (!modelId) return config;
  const updated = updateLocalLLMModelSnapshot(config, modelId, { downloadProgress: progress });
  return { ...updated, downloadProgress: progress };
}

export function finishLocalLLMDownloadSnapshot(config: LocalLLMConfig, modelId: string, path: string): LocalLLMConfig {
  const updated = updateLocalLLMModelSnapshot(config, modelId, {
    downloaded: true,
    path,
    downloadProgress: null,
    isReady: true,
  });
  return {
    ...updated,
    downloadStatus: 'completed',
    lastCompletedModelId: modelId,
    downloadingModelId: null,
    downloadProgress: null,
  };
}

export function failLocalLLMDownloadSnapshot(config: LocalLLMConfig, error: string): LocalLLMConfig {
  const modelId = config.downloadingModelId;
  if (!modelId) return config;
  const updated = updateLocalLLMModelSnapshot(config, modelId, { downloadError: error });
  return {
    ...updated,
    downloadStatus: 'error',
    downloadError: error,
  };
}

export function setLocalLLMBannerDismissedSnapshot(config: LocalLLMConfig, isDismissed: boolean): LocalLLMConfig {
  return { ...config, bannerDismissed: isDismissed, isBannerDismissed: isDismissed };
}

export function clearLocalLLMDownloadErrorSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  const modelId = config.downloadingModelId ?? config.lastCompletedModelId;
  if (!modelId) return { ...config, downloadError: null, downloadStatus: 'idle' };
  const updated = updateLocalLLMModelSnapshot(config, modelId, { downloadError: null });
  return { ...updated, downloadError: null, downloadStatus: 'idle' };
}

export function markLocalLLMDownloadCompletionHandledSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  const modelId = config.lastCompletedModelId;
  if (!modelId) return { ...config, downloadCompletionHandled: true };
  const updated = updateLocalLLMModelSnapshot(config, modelId, { downloadCompletionHandled: true });
  return { ...updated, downloadCompletionHandled: true };
}

export function clearLocalLLMDownloadSessionSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  const modelId = config.downloadingModelId ?? config.lastCompletedModelId;
  if (!modelId) {
    return {
      ...config,
      downloadProgress: null,
      downloadError: null,
      downloadCompletionHandled: false,
      downloadingModelId: null,
      lastCompletedModelId: null,
      downloadStatus: 'idle',
    };
  }
  const updated = updateLocalLLMModelSnapshot(config, modelId, {
    downloadProgress: null,
    downloadError: null,
    downloadCompletionHandled: false,
    sourceRoute: null,
  });
  return {
    ...updated,
    downloadProgress: null,
    downloadError: null,
    downloadCompletionHandled: false,
    downloadingModelId: null,
    lastCompletedModelId: null,
    downloadStatus: 'idle',
  };
}

export function startLocalLLMLoadingSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  return {
    ...config,
    isLoading: true,
    loadProgress: { loaded: 0, total: 100, percentage: 0 },
    loadError: null,
  };
}

export function updateLocalLLMLoadProgressSnapshot(config: LocalLLMConfig, progress: number): LocalLLMConfig {
  const modelId = config.selectedModelId;
  if (!modelId) return config;
  const updated = updateLocalLLMModelSnapshot(config, modelId, {
    loadProgress: { loaded: progress, total: 100, percentage: progress },
  });
  return { ...updated, loadProgress: { loaded: progress, total: 100, percentage: progress } };
}

export function finishLocalLLMLoadingSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  const modelId = config.selectedModelId;
  if (!modelId) return { ...config, isLoading: false, loadProgress: null };
  const updated = updateLocalLLMModelSnapshot(config, modelId, { loading: false, loadProgress: null });
  return { ...updated, isLoading: false, loadProgress: null };
}

export function failLocalLLMLoadingSnapshot(config: LocalLLMConfig, error: string): LocalLLMConfig {
  const modelId = config.selectedModelId;
  if (!modelId) return { ...config, isLoading: false, loadError: error };
  const updated = updateLocalLLMModelSnapshot(config, modelId, { loading: false, loadError: error });
  return { ...updated, isLoading: false, loadError: error };
}

export function clearLocalLLMLoadErrorSnapshot(config: LocalLLMConfig): LocalLLMConfig {
  const modelId = config.selectedModelId;
  if (!modelId) return { ...config, loadError: null };
  const updated = updateLocalLLMModelSnapshot(config, modelId, { loadError: null });
  return { ...updated, loadError: null };
}

// ============================================================================
// BYOK Types
// ============================================================================

export const BYOK_PROVIDERS = ['openai', 'anthropic', 'google'] as const;
export type BYOKProviderType = (typeof BYOK_PROVIDERS)[number];

export function isBYOKProvider(value: unknown): value is BYOKProviderType {
  return typeof value === 'string' && BYOK_PROVIDERS.includes(value as BYOKProviderType);
}

export interface BYOKConfig {
  enabled: boolean;
  provider: BYOKProviderType | null;
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
}

export interface BYOKStoreActions {
  updateConfig: (updater: (config: BYOKConfig) => BYOKConfig) => void;
  resetConfig: () => void;
}

export interface BYOKStoreState {
  config: BYOKConfig;
  actions: BYOKStoreActions;
}

export function createBYOKSnapshot(persisted: BYOKConfig): BYOKConfig {
  return { ...persisted };
}

export function resetBYOKSnapshot(): BYOKConfig {
  return {
    enabled: false,
    provider: null,
    apiKey: null,
    baseUrl: null,
    model: null,
  };
}

export function updateBYOKConfigSnapshot(
  _state: BYOKStoreState,
  updater: (config: BYOKConfig) => BYOKConfig
): Partial<BYOKStoreState> {
  return { config: updater(_state.config) };
}

// ============================================================================
// Apple Intelligence Types
// ============================================================================

export interface AppleIntelligenceConfig {
  enabled: boolean;
}

export interface AppleIntelligenceStoreActions {
  setEnabled: (enabled: boolean) => void;
  enable: () => void;
  disable: () => void;
}

export interface AppleIntelligenceStoreState {
  enabled: boolean;
  actions: AppleIntelligenceStoreActions;
}

export function createAppleIntelligenceSnapshot(): AppleIntelligenceConfig {
  return { enabled: false };
}

export function setAppleIntelligenceEnabledSnapshot(
  state: AppleIntelligenceStoreState,
  enabled: boolean
): Partial<AppleIntelligenceStoreState> {
  return { enabled };
}

export function enableAppleIntelligenceSnapshot(
  state: AppleIntelligenceStoreState
): Partial<AppleIntelligenceStoreState> {
  return { enabled: true };
}

export function disableAppleIntelligenceSnapshot(
  state: AppleIntelligenceStoreState
): Partial<AppleIntelligenceStoreState> {
  return { enabled: false };
}

// ============================================================================
// Inference Mode Types
// ============================================================================

export type { InferenceMode };

export interface InferenceModeAvailability {
  appleIntelligence: boolean;
  localLLM: boolean;
  byok: boolean;
}

export interface InferenceModeStoreActions {
  activate: (
    mode: Exclude<InferenceMode, 'default'>,
    availability?: InferenceModeAvailability
  ) => { ok: boolean; error?: string };
  reset: () => void;
  sync: (availability: InferenceModeAvailability) => void;
}

export interface InferenceModeStoreState {
  activeMode: InferenceMode;
  availability: InferenceModeAvailability;
  actions: InferenceModeStoreActions;
}

export type InferenceModeTransitionReason = 'user_choice' | 'fallback' | 'config_change';

export function createInferenceModeSnapshot(): Omit<InferenceModeStoreState, 'actions'> {
  return {
    activeMode: 'local',
    availability: {
      appleIntelligence: false,
      localLLM: false,
      byok: false,
    },
  };
}

export function resetInferenceModeSnapshot(): Omit<InferenceModeStoreState, 'actions'> {
  return createInferenceModeSnapshot();
}

export function activateInferenceModeSnapshot(
  state: InferenceModeStoreState,
  mode: Exclude<InferenceMode, 'default'>,
  availability?: InferenceModeAvailability
): { ok: boolean; state?: Partial<InferenceModeStoreState>; error?: string } {
  const newAvailability = availability ?? state.availability;

  // Check if the mode is available
  if (mode === 'apple' && !newAvailability.appleIntelligence) {
    return { ok: false, error: 'Apple Intelligence not available' };
  }
  if (mode === 'local' && !newAvailability.localLLM) {
    return { ok: false, error: 'Local LLM not available' };
  }
  if (mode === 'byok' && !newAvailability.byok) {
    return { ok: false, error: 'BYOK not configured' };
  }

  return {
    ok: true,
    state: {
      activeMode: mode,
      availability: newAvailability,
    },
  };
}

export function syncInferenceModeSnapshot(
  state: InferenceModeStoreState,
  availability: InferenceModeAvailability
): Partial<InferenceModeStoreState> {
  return { availability };
}

export function getInferenceProviderFromMode(state: InferenceModeStoreState): InferenceMode {
  return state.activeMode;
}

// ============================================================================
// Recommendation Cadence Types
// ============================================================================

export const DEFAULT_RECOMMENDATION_CADENCE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export interface RecommendationCadenceStoreActions {
  setCadence: (cadence: number) => void;
  reset: () => void;
}

export interface RecommendationCadenceStoreState {
  currentCadence: number;
  actions: RecommendationCadenceStoreActions;
}

export function createRecommendationCadenceSnapshot(): Omit<RecommendationCadenceStoreState, 'actions'> {
  return {
    currentCadence: DEFAULT_RECOMMENDATION_CADENCE,
  };
}

export function resetRecommendationCadenceSnapshot(): Omit<RecommendationCadenceStoreState, 'actions'> {
  return createRecommendationCadenceSnapshot();
}

export function setRecommendationCadenceSnapshot(
  _state: RecommendationCadenceStoreState,
  cadence: number
): Partial<RecommendationCadenceStoreState> {
  return { currentCadence: cadence };
}
