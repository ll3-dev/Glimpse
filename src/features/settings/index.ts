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
  getProvider,
  // Setters
  enableBYOK,
  disableBYOK,
  setProvider,
  setApiKey,
  clearApiKey,
  // Utilities
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
