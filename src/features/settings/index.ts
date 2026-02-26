/**
 * Settings Feature Module
 */

export {
  // Types
  type BYOKConfig,
  type BYOKProviderType,
  type ValidationResult,
  BYOKProvider,
  // Getters
  getBYOKConfig,
  useBYOKConfig,
  useBYOKReady,
  useBYOKCredentialsConfigured,
  isBYOKReady,
  hasBYOKCredentials,
  getApiKey,
  getBaseUrl,
  getModel,
  getProvider,
  // Setters
  enableBYOK,
  disableBYOK,
  setProvider,
  setApiKey,
  setBaseUrl,
  setModel,
  clearApiKey,
  // Utilities
  BYOK_MODEL_REGISTRY,
  isAppOnlyModelRegistry,
  isPreviewModelAllowed,
  maskApiKey,
  validateApiKey,
} from './byokSettings';

export {
  // Types
  type AppleIntelligenceConfig,
  // Functions
  checkAppleIntelligenceAvailability,
  getAppleIntelligenceConfig,
  useAppleIntelligenceConfig,
  isAppleIntelligenceEnabled,
  enableAppleIntelligence,
  disableAppleIntelligence,
  setAppleIntelligenceEnabled,
  getInferenceProvider,
} from './appleIntelligenceToggle';

// Local LLM - Types (re-exported from store)
export { type LocalLLMConfig, type LocalModel } from './local-llm.selectors';

// Local LLM - Selectors
export {
  getLocalLLMConfig,
  useLocalLLMConfig,
  isLocalLLMEnabled,
  useLocalLLMEnabled,
  isLocalLLMReady,
  useLocalLLMReady,
  getSelectedLocalModel,
  useSelectedLocalModel,
  getAvailableLocalModels,
  useAvailableLocalModels,
  getSelectedLocalModelId,
  useSelectedLocalModelId,
} from './local-llm.selectors';

// Local LLM - Commands
export {
  enableLocalLLM,
  disableLocalLLM,
  selectModel as selectLocalLLMModel,
  addModel as addLocalLLMModel,
  removeModel as removeLocalLLMModel,
  updateModel as updateLocalLLMModel,
  markModelReady,
  clearLocalLLMSettings,
  setAvailableModels,
  // Download commands
  startDownload,
  updateDownloadProgress,
  finishDownload,
  failDownload,
  clearDownloadError,
  // Loading commands
  startLoading,
  updateLoadProgress,
  finishLoading,
  failLoading,
  clearLoadError,
} from './local-llm.commands';
