/**
 * rustra engine bootstrap for native platforms.
 *
 * Installs the JSI bindings once, configures the global engine, and reports
 * whether the rustra path is live. Callers treat `null` as "fall back to the
 * existing core client" — the fallback creates the old (Nitro/in-memory)
 * client instead, and the two paths are mutually exclusive so at most one
 * SQLite connection is ever opened (see rustra-core-client.native.ts).
 */

import { configureRustraEngine } from '@glimpse/bridge-generated';
import { getRustraNative, installRustraJSI } from '../../../modules/rustra-jsi/src';
import { createRustraJsonEngine } from './rustra-json-engine';
import { logger } from '@/src/utils/logger';

let bootstrapPromise: Promise<boolean> | null = null;

export function bootstrapRustraEngine(): Promise<boolean> {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    try {
      await installRustraJSI();
      configureRustraEngine(createRustraJsonEngine(getRustraNative()));
      return true;
    } catch (error) {
      // Expo Go / unbundled JS / broken native link — the caller falls back
      // to the existing core client path. Log the reason here (the caller's
      // warning is generic) so diagnosis doesn't require a re-run.
      logger.warn('RustraJSI bootstrap failed', {
        reason: error instanceof Error ? error.message : String(error),
      });
      bootstrapPromise = null;
      return false;
    }
  })();

  return bootstrapPromise;
}
