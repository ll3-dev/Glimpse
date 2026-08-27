import { describe, expect, test } from 'bun:test';
import { gzip, ungzip } from 'pako';
import {
  GZIP_THRESHOLD_BYTES,
  maybeCompressRequestBody,
  parseResponseBody,
  shouldCompress,
} from './payload-compression';

describe('shouldCompress', () => {
  test('small payloads stay plain', () => {
    expect(shouldCompress(JSON.stringify({ snapshot: { items: [] } }))).toBe(false);
  });

  test('payloads at or above the threshold compress', () => {
    const big = 'x'.repeat(GZIP_THRESHOLD_BYTES);
    expect(shouldCompress(big)).toBe(true);
  });
});

describe('maybeCompressRequestBody', () => {
  test('below threshold: plain JSON with no extra headers', () => {
    const result = maybeCompressRequestBody('{"a":1}');
    expect(result.headers['Content-Encoding']).toBeUndefined();
    expect(Buffer.from(result.body).toString('utf8')).toBe('{"a":1}');
  });

  test('above threshold: gzipped body carrying gzip headers', () => {
    const json = JSON.stringify({ snapshot: { pad: 'y'.repeat(200_000) } });
    const result = maybeCompressRequestBody(json);
    expect(result.headers['Content-Encoding']).toBe('gzip');
    expect(result.headers['Content-Type']).toBe('application/json');
    // Round-trips and is actually smaller.
    expect(Buffer.from(ungzip(result.body)).toString('utf8')).toEqual(json);
    expect(result.body.byteLength).toBeLessThan(Buffer.byteLength(json, 'utf8') / 2);
  });
});

describe('parseResponseBody', () => {
  const payload = { protocolVersion: 1, snapshot: null, fingerprint: 'ab' };

  test('parses a plain (uncompressed) response', () => {
    const raw = Buffer.from(JSON.stringify(payload), 'utf8');
    expect(parseResponseBody(raw, null)).toEqual(payload);
  });

  test('decodes a gzipped response via content-encoding', () => {
    const gzipped = gzip(Buffer.from(JSON.stringify(payload), 'utf8'));
    expect(parseResponseBody(gzipped, 'gzip')).toEqual(payload);
  });

  test('header casing does not matter to the caller-decoded value', () => {
    const gzipped = gzip(Buffer.from(JSON.stringify(payload), 'utf8'));
    expect(parseResponseBody(gzipped, 'GZIP')).toEqual(payload);
  });
});
