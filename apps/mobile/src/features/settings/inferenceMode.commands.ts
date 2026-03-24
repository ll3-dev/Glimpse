import { setAppleIntelligenceEnabled } from './appleIntelligenceToggle';
import { disableBYOK, enableBYOK } from './byokSettings';
import { disableLocalLLM, enableLocalLLM } from './local-llm.commands';
import type { ValidationResult } from './byok.types';

export function enableExclusiveAppleIntelligence(): boolean {
  const success = setAppleIntelligenceEnabled(true);
  if (!success) {
    return false;
  }

  disableLocalLLM();
  disableBYOK();
  return true;
}

export function enableExclusiveLocalLLM(): { success: boolean; error?: string } {
  const result = enableLocalLLM();
  if (!result.success) {
    return result;
  }

  setAppleIntelligenceEnabled(false);
  disableBYOK();
  return result;
}

export function enableExclusiveBYOK(): ValidationResult {
  const result = enableBYOK();
  if (!result.valid) {
    return result;
  }

  setAppleIntelligenceEnabled(false);
  disableLocalLLM();
  return result;
}
