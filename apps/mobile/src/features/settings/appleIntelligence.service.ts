import { useEffect, useState } from 'react';
import { createAppleIntelligenceBridge } from '@/src/features/ai/apple-intelligence-bridge';
import {
  createAppleIntelligenceStore,
  getAppleIntelligenceEnabled,
  useAppleIntelligenceStoreValue,
} from '@/src/stores/settings/appleIntelligence.store';
import { checkAppleIntelligenceAvailability as checkAvailability } from './appleIntelligence.version';
import type {
  AppleIntelligenceAvailabilityReasonCode,
  AppleIntelligenceConfig,
  AppleIntelligenceToggleDeps,
} from './appleIntelligence.types';

type AvailabilityResult = {
  available: boolean;
  reason?: string;
  reasonCode?: AppleIntelligenceAvailabilityReasonCode;
};

function getUnavailableReason(
  platform: AppleIntelligenceToggleDeps['platform'],
  reasonCode?: AppleIntelligenceAvailabilityReasonCode
): string | undefined {
  switch (reasonCode) {
    case 'unsupported_platform':
      return 'Apple Intelligence는 Apple 기기에서만 사용할 수 있습니다';
    case 'unsupported_os':
      return `${platform.OS === 'macos' ? 'macOS 15.1' : 'iOS 18.1'} 이상이 필요합니다`;
    case 'unsupported_device':
      return '이 기기는 Apple Intelligence를 지원하지 않습니다';
    case 'disabled':
      return '기기 설정에서 Apple Intelligence를 먼저 활성화해주세요';
    case 'not_configured':
      return 'Apple Intelligence가 아직 준비되지 않았습니다. 기기 설정을 확인해주세요';
    default:
      return undefined;
  }
}

function createConfig(
  enabled: boolean,
  availability: AvailabilityResult,
  isCheckingAvailability: boolean
): AppleIntelligenceConfig {
  return {
    enabled: availability.available && enabled,
    isAvailable: availability.available,
    isCheckingAvailability,
    unavailableReason: availability.reason,
    availabilityReasonCode: availability.reasonCode,
  };
}

export function createAppleIntelligenceToggleService(deps: AppleIntelligenceToggleDeps) {
  const appleIntelligenceStore = createAppleIntelligenceStore();
  const bridge = deps.bridge ?? createAppleIntelligenceBridge();

  function checkAppleIntelligenceAvailability(): AvailabilityResult {
    const result = checkAvailability(deps.platform);

    if (result.available) {
      return { available: true };
    }

    const reasonCode =
      deps.platform.OS !== 'ios' && deps.platform.OS !== 'macos'
        ? 'unsupported_platform'
        : 'unsupported_os';

    return {
      available: false,
      reason: result.reason,
      reasonCode,
    };
  }

  async function resolveAppleIntelligenceAvailability(): Promise<AvailabilityResult> {
    const versionAvailability = checkAppleIntelligenceAvailability();
    if (!versionAvailability.available) {
      return versionAvailability;
    }

    const nativeAvailability = await bridge.isAvailable();

    if (nativeAvailability.available) {
      return { available: true };
    }

    return {
      available: false,
      reasonCode: nativeAvailability.reason,
      reason: getUnavailableReason(deps.platform, nativeAvailability.reason),
    };
  }

  function getAppleIntelligenceConfig(): AppleIntelligenceConfig {
    const enabled = getAppleIntelligenceEnabled(appleIntelligenceStore);
    const availability = checkAppleIntelligenceAvailability();

    if (!availability.available) {
      return createConfig(enabled, availability, false);
    }

    return createConfig(false, { available: false }, true);
  }

  function useAppleIntelligenceConfig(): AppleIntelligenceConfig {
    const enabled = useAppleIntelligenceStoreValue(appleIntelligenceStore, (state) => state.enabled);
    const [availability, setAvailability] = useState<AvailabilityResult>(() => {
      const initialAvailability = checkAppleIntelligenceAvailability();
      return initialAvailability.available ? { available: false } : initialAvailability;
    });
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(
      () => checkAppleIntelligenceAvailability().available
    );

    useEffect(() => {
      let cancelled = false;
      const initialAvailability = checkAppleIntelligenceAvailability();

      if (!initialAvailability.available) {
        setAvailability(initialAvailability);
        setIsCheckingAvailability(false);
        return;
      }

      setAvailability({ available: false });
      setIsCheckingAvailability(true);

      void resolveAppleIntelligenceAvailability()
        .then((nextAvailability) => {
          if (cancelled) {
            return;
          }

          setAvailability(nextAvailability);
          setIsCheckingAvailability(false);
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setAvailability({
            available: false,
            reasonCode: 'not_configured',
            reason: getUnavailableReason(deps.platform, 'not_configured'),
          });
          setIsCheckingAvailability(false);
        });

      return () => {
        cancelled = true;
      };
    }, []);

    return createConfig(enabled, availability, isCheckingAvailability);
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

  return {
    checkAppleIntelligenceAvailability,
    resolveAppleIntelligenceAvailability,
    getAppleIntelligenceConfig,
    useAppleIntelligenceConfig,
    isAppleIntelligenceEnabled,
    enableAppleIntelligence,
    disableAppleIntelligence,
    setAppleIntelligenceEnabled,
  };
}
