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
  isBYOKReady,
  getApiKey,
  getProvider,
  // Setters
  enableBYOK,
  disableBYOK,
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
  isAppleIntelligenceEnabled,
  enableAppleIntelligence,
  disableAppleIntelligence,
  setAppleIntelligenceEnabled,
  getInferenceProvider,
} from './appleIntelligenceToggle';
