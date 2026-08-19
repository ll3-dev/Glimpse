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
    } catch {
      // Expo Go / unbundled JS / broken native link — the caller falls back
      // to the existing core client path. Logged by the caller so the reason
      // surfaces in app logs rather than being swallowed here.
      bootstrapPromise = null;
      return false;
    }
  })();

  return bootstrapPromise;
}
