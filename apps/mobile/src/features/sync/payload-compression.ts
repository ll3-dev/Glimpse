/**
 * Optional gzip compression for sync HTTP payloads.
 *
 * Full-snapshot JSON compresses ~10x, which matters at the 10k-record scale
 * (~13MB per poll). Both peers speak gzip: the desktop wraps its router in
 * tower-http Decompression/CompressionLayer, so a gzipped request body with
 * `Content-Encoding: gzip` is transparently decoded and responses are
 * compressed when we advertise `Accept-Encoding: gzip`.
 *
 * Small payloads skip compression — the framing overhead outweighs the win.
 *
 * All byte↔string conversion is Hermes-safe: Hermes ships TextEncoder but no
 * TextDecoder and no global Buffer, so the same pure-JS UTF-8 decode used by
 * the rustra JSON engine is applied here (see rustra-json-engine.ts).
 */

import { gzip as gzipSync, ungzip as gunzipSync } from 'pako';

/** Below this size (bytes) a body is sent as plain JSON. */
export const GZIP_THRESHOLD_BYTES = 64 * 1024;

const utf8Encoder = new TextEncoder();

/** Encodes a JS string to UTF-8 bytes without Buffer. */
function encodeUtf8(text: string): Uint8Array {
  return utf8Encoder.encode(text);
}

/** Decodes UTF-8 bytes to a JS string without Buffer/TextDecoder. */
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

export function shouldCompress(body: string): boolean {
  return encodeUtf8(body).length >= GZIP_THRESHOLD_BYTES;
}

export interface CompressedRequest {
  body: Uint8Array;
  headers: Record<string, string>;
}

/**
 * Wrap an outgoing JSON body in gzip when it is large enough to be worth it.
 * Uncompressed payloads still carry Content-Type — the desktop's axum
 * `.json()` extractor rejects requests without it (415), and a binary body
 * never gets an implicit one from fetch.
 */
export function maybeCompressRequestBody(json: string): CompressedRequest {
  if (!shouldCompress(json)) {
    return { body: encodeUtf8(json), headers: { 'Content-Type': 'application/json' } };
  }
  return {
    body: gzipSync(json),
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
    },
  };
}

/** gzip streams always start with the magic bytes 0x1f 0x8b. */
function isGzipBytes(raw: Uint8Array): boolean {
  return raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;
}

/**
 * Decode a response body that arrived gzip-encoded (Content-Encoding header)
 * and parse it as JSON. Falls back to plain parsing when the server ignored
 * our Accept-Encoding (older desktop without tower-http).
 *
 * The gzip decision comes from the body's magic bytes, not the header alone:
 * iOS NSURLSession decompresses transparently but leaves `Content-Encoding:
 * gzip` on the response, so re-inflating on header evidence alone would fail
 * with "incorrect header check".
 */
export function parseResponseBody<T>(
  raw: Uint8Array,
  contentEncoding: string | null,
): T {
  const headerSaysGzip =
    contentEncoding != null && contentEncoding.toLowerCase().includes('gzip');
  const text = decodeUtf8(
    headerSaysGzip && isGzipBytes(raw) ? gunzipSync(raw) : raw,
  );
  return JSON.parse(text) as T;
}
