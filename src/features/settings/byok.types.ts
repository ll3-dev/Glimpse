import { BYOKProvider, type BYOKConfig, type BYOKProviderType } from '@/src/stores/settings/byok.store';

export { BYOKProvider };
export type { BYOKConfig, BYOKProviderType };

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
