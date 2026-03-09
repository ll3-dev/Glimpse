import type { AppleIntelligenceBridge, AppleIntelligenceAvailability } from '@/src/features/ai/apple-intelligence-bridge';

export interface AppleIntelligenceConfig {
  enabled: boolean;
  isAvailable: boolean;
  isCheckingAvailability: boolean;
  unavailableReason?: string;
  availabilityReasonCode?: AppleIntelligenceAvailabilityReasonCode;
}

export interface AppleIntelligencePlatform {
  OS: string;
  Version: string | number;
}

export type AppleIntelligenceAvailabilityReasonCode =
  | AppleIntelligenceAvailability['reason']
  | 'unsupported_platform';

export interface AppleIntelligenceToggleDeps {
  platform: AppleIntelligencePlatform;
  bridge?: AppleIntelligenceBridge;
}
