import { createAppleIntelligenceToggleService } from './appleIntelligence.service';
import { resolveDefaultPlatform } from './appleIntelligence.platform';
import type { AppleIntelligenceToggleDeps } from './appleIntelligence.types';

export type {
  AppleIntelligenceConfig,
  AppleIntelligencePlatform,
  AppleIntelligenceToggleDeps,
} from './appleIntelligence.types';

function getDefaultDeps(): AppleIntelligenceToggleDeps {
  return {
    platform: resolveDefaultPlatform(),
  };
}

export function createAppleIntelligenceToggle(
  deps: AppleIntelligenceToggleDeps = getDefaultDeps()
) {
  return createAppleIntelligenceToggleService(deps);
}

export const checkAppleIntelligenceAvailability =
  (...args: Parameters<ReturnType<typeof createAppleIntelligenceToggle>['checkAppleIntelligenceAvailability']>) =>
    createAppleIntelligenceToggle().checkAppleIntelligenceAvailability(...args);
export const resolveAppleIntelligenceAvailability =
  (...args: Parameters<ReturnType<typeof createAppleIntelligenceToggle>['resolveAppleIntelligenceAvailability']>) =>
    createAppleIntelligenceToggle().resolveAppleIntelligenceAvailability(...args);
export const getAppleIntelligenceConfig = () =>
  createAppleIntelligenceToggle().getAppleIntelligenceConfig();
export const useAppleIntelligenceConfig = () =>
  createAppleIntelligenceToggle().useAppleIntelligenceConfig();
export const isAppleIntelligenceEnabled = () =>
  createAppleIntelligenceToggle().isAppleIntelligenceEnabled();
export const enableAppleIntelligence = () =>
  createAppleIntelligenceToggle().enableAppleIntelligence();
export const disableAppleIntelligence = () =>
  createAppleIntelligenceToggle().disableAppleIntelligence();
export const setAppleIntelligenceEnabled = (
  ...args: Parameters<ReturnType<typeof createAppleIntelligenceToggle>['setAppleIntelligenceEnabled']>
) => createAppleIntelligenceToggle().setAppleIntelligenceEnabled(...args);
