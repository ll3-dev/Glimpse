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
 */

import { gzip as gzipSync, ungzip as gunzipSync } from 'pako';

/** Below this size (bytes) a body is sent as plain JSON. */
export const GZIP_THRESHOLD_BYTES = 64 * 1024;

export function shouldCompress(body: string): boolean {
  return Buffer.byteLength(body, 'utf8') >= GZIP_THRESHOLD_BYTES;
}

export interface CompressedRequest {
  body: Uint8Array;
  headers: Record<string, string>;
}

/**
 * Wrap an outgoing JSON body in gzip when it is large enough to be worth it.
 * Returns the original payload untouched (plain Content-Type) otherwise.
 */
export function maybeCompressRequestBody(json: string): CompressedRequest {
  if (!shouldCompress(json)) {
    return { body: Buffer.from(json, 'utf8'), headers: {} };
  }
  return {
    body: gzipSync(json),
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
    },
  };
}

/**
 * Decode a response body that arrived gzip-encoded (Content-Encoding header)
 * and parse it as JSON. Falls back to plain parsing when the server ignored
 * our Accept-Encoding (older desktop without tower-http).
 */
export function parseResponseBody<T>(
  raw: Uint8Array,
  contentEncoding: string | null,
): T {
  const text =
    contentEncoding && contentEncoding.toLowerCase().includes('gzip')
      ? Buffer.from(gunzipSync(raw)).toString('utf8')
      : Buffer.from(raw).toString('utf8');
  return JSON.parse(text) as T;
}
