import {
  activateInferenceMode,
} from '@/src/stores/settings/inference-mode.store';
import type { InferenceModeTransitionReason } from '@/src/features/core/application/state';
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
  activateInferenceMode('apple-intelligence');
  return true;
}

export function enableExclusiveLocalLLM(): { success: boolean; error?: string } {
  const result = enableLocalLLM();
  if (!result.success) {
    return result;
  }

  setAppleIntelligenceEnabled(false);
  disableBYOK();
  activateInferenceMode('local-llm');
  return result;
}

export function enableExclusiveBYOK(): ValidationResult {
  const result = enableBYOK();
  if (!result.valid) {
    return result;
  }

  setAppleIntelligenceEnabled(false);
  disableLocalLLM();
  activateInferenceMode('byok');
  return result;
}

export type { InferenceModeTransitionReason };
