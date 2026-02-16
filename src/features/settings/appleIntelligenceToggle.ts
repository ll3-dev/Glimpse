import { createAppleIntelligenceToggleService } from './appleIntelligence.service';
import { resolveDefaultPlatform } from './appleIntelligence.platform';
import type { AppleIntelligenceToggleDeps } from './appleIntelligence.types';

export type {
  AppleIntelligenceConfig,
  AppleIntelligencePlatform,
  AppleIntelligenceToggleDeps,
} from './appleIntelligence.types';

const defaultDeps: AppleIntelligenceToggleDeps = {
  platform: resolveDefaultPlatform(),
};

export function createAppleIntelligenceToggle(deps: AppleIntelligenceToggleDeps = defaultDeps) {
  return createAppleIntelligenceToggleService(deps);
}

const appleIntelligenceToggle = createAppleIntelligenceToggle();

export const checkAppleIntelligenceAvailability =
  appleIntelligenceToggle.checkAppleIntelligenceAvailability;
export const getAppleIntelligenceConfig = appleIntelligenceToggle.getAppleIntelligenceConfig;
export const useAppleIntelligenceConfig = appleIntelligenceToggle.useAppleIntelligenceConfig;
export const isAppleIntelligenceEnabled = appleIntelligenceToggle.isAppleIntelligenceEnabled;
export const enableAppleIntelligence = appleIntelligenceToggle.enableAppleIntelligence;
export const disableAppleIntelligence = appleIntelligenceToggle.disableAppleIntelligence;
export const setAppleIntelligenceEnabled = appleIntelligenceToggle.setAppleIntelligenceEnabled;
export const getInferenceProvider = appleIntelligenceToggle.getInferenceProvider;
