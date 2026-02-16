import {
  createAppleIntelligenceStore,
  getAppleIntelligenceEnabled,
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
    const enabled = useAppleIntelligenceStoreValue(appleIntelligenceStore, (state) => state.enabled);
    const { available, reason } = checkAppleIntelligenceAvailability();

    return {
      enabled: available && enabled,
      isAvailable: available,
      unavailableReason: reason,
    };
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

    appleIntelligenceStore.getState().actions.enable();
    return true;
  }

  function disableAppleIntelligence(): void {
    appleIntelligenceStore.getState().actions.disable();
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
