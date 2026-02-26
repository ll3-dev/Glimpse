export interface AppleIntelligenceConfig {
  enabled: boolean;
  isAvailable: boolean;
  unavailableReason?: string;
}

export interface AppleIntelligencePlatform {
  OS: string;
  Version: string | number;
}

export interface AppleIntelligenceToggleDeps {
  platform: AppleIntelligencePlatform;
}
