import {
  BYOK_PROVIDERS,
  type BYOKConfig,
  type BYOKProviderType,
} from '@/src/features/core/application/state';

export const BYOKProvider = BYOK_PROVIDERS;
export type { BYOKConfig, BYOKProviderType };

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
