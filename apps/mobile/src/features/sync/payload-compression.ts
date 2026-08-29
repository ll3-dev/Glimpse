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
 * TextDecoder and no global Buffer, so the shared pure-JS helpers from
 * `@/src/lib/utf8` are used here (the rustra JSON engine uses the same ones).
 */

import { gzip as gzipSync, ungzip as gunzipSync } from 'pako';
import { decodeUtf8, encodeUtf8, utf8ByteLength } from '@/src/lib/utf8';

/** Below this size (bytes) a body is sent as plain JSON. */
export const GZIP_THRESHOLD_BYTES = 64 * 1024;

export function shouldCompress(body: string): boolean {
  return utf8ByteLength(body) >= GZIP_THRESHOLD_BYTES;
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
  // Encode exactly once — the byte copy doubles as the threshold measurement.
  const plain = encodeUtf8(json);
  if (plain.length < GZIP_THRESHOLD_BYTES) {
    return { body: plain, headers: { 'Content-Type': 'application/json' } };
  }
  return {
    body: gzipSync(plain),
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
