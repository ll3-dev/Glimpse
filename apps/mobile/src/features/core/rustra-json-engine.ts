/**
 * Hermes-safe JSON engine for the rustra JSI native surface.
 *
 * `@rustra/react-native`'s `createReactNativeEngine` does the same job but
 * decodes responses with `new TextDecoder()`, which Hermes does not provide
 * (it ships TextEncoder only — no RN core polyfill either as of 0.83). This
 * local engine keeps the identical wire contract — request
 * `{command, args}` → response `{ok, result, error}` over
 * `__rustraNative.invoke` — and decodes UTF-8 in pure JS, the same approach
 * rustra's generated codecs use for Lynx/QuickJS runtimes.
 *
 * Errors reject with `RustraCommandError` (Error subclass carrying
 * `code` + `message`), matching the other platform engines.
 */

import { parseRustraErrorString } from '@rustra/react-native';
import type { EngineClient } from '@rustra/types';
import { decodeUtf8 } from '@/src/lib/utf8';

export interface RustraJsonEngineNative {
  invoke(payload: ArrayBuffer): ArrayBuffer;
}

export function createRustraJsonEngine(native: RustraJsonEngineNative): EngineClient {
  const encoder = new TextEncoder();

  return {
    async invoke<T>(command: string, args?: unknown): Promise<T> {
      const payload = encoder.encode(JSON.stringify({ command, args }));
      const resultBytes = native.invoke(payload.buffer as ArrayBuffer);
      const response = JSON.parse(
        decodeUtf8(new Uint8Array(resultBytes)),
      ) as { ok: boolean; result?: T; error?: string };

      if (!response.ok) {
        throw parseRustraErrorString(response.error);
      }
      return response.result as T;
    },
  };
}
