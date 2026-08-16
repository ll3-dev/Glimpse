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

/** Decodes UTF-8 bytes to a JS string without TextDecoder. */
function decodeUtf8(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  const len = bytes.length;
  while (i < len) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
    } else if ((b & 0xe0) === 0xc0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if ((b & 0xf0) === 0xe0) {
      out += String.fromCharCode(
        ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f),
      );
      i += 3;
    } else if ((b & 0xf8) === 0xf0) {
      const cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      const adj = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (adj >> 10), 0xdc00 + (adj & 0x3ff));
      i += 4;
    } else {
      i += 1; // invalid lead byte — skip
    }
  }
  return out;
}

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
