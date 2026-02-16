import {
  createAppleIntelligenceStore,
  getAppleIntelligenceEnabled,
  setAppleIntelligenceEnabledValue,
  useAppleIntelligenceStoreValue,
} from '@/src/stores/settings/appleIntelligence.store';
import { checkAppleIntelligenceAvailability as checkAvailability } from './appleIntelligence.version';
import type { AppleIntelligenceConfig, AppleIntelligenceToggleDeps } from './appleIntelligence.types';

export function createAppleIntelligenceToggleService(deps: AppleIntelligenceToggleDeps) {
  const appleIntelligenceStore = createAppleIntelligenceStore();

  function checkAppleIntelligenceAvailability() {
    return checkAvailability(deps.platform);
  }

  function getAppleIntelligenceConfig(): AppleIntelligenceConfig {
    const { available, reason } = checkAppleIntelligenceAvailability();
    const enabled = getAppleIntelligenceEnabled(appleIntelligenceStore);

    return {
      enabled: available && enabled,
      isAvailable: available,
      unavailableReason: reason,
    };
  }

  function useAppleIntelligenceConfig(): AppleIntelligenceConfig {
    return useAppleIntelligenceStoreValue(appleIntelligenceStore, (state) => {
      const { available, reason } = checkAppleIntelligenceAvailability();
      return {
        enabled: available && state.enabled,
        isAvailable: available,
        unavailableReason: reason,
      };
    });
  }

  function isAppleIntelligenceEnabled(): boolean {
    const { available } = checkAppleIntelligenceAvailability();
    return available && getAppleIntelligenceEnabled(appleIntelligenceStore);
  }

  function enableAppleIntelligence(): boolean {
    const { available } = checkAppleIntelligenceAvailability();
    if (!available) {
      return false;
    }

    setAppleIntelligenceEnabledValue(appleIntelligenceStore, true);
    return true;
  }

  function disableAppleIntelligence(): void {
    setAppleIntelligenceEnabledValue(appleIntelligenceStore, false);
  }

  function setAppleIntelligenceEnabled(enabled: boolean): boolean {
    if (enabled) {
      return enableAppleIntelligence();
    }

    disableAppleIntelligence();
    return true;
  }

  function getInferenceProvider(): 'apple-intelligence' | 'default' {
    if (isAppleIntelligenceEnabled()) {
      return 'apple-intelligence';
    }
    return 'default';
  }

  return {
    checkAppleIntelligenceAvailability,
    getAppleIntelligenceConfig,
    useAppleIntelligenceConfig,
    isAppleIntelligenceEnabled,
    enableAppleIntelligence,
    disableAppleIntelligence,
    setAppleIntelligenceEnabled,
    getInferenceProvider,
  };
}
