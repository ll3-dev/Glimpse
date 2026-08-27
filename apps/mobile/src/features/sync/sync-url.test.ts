import { describe, expect, test } from 'bun:test';
import {
  discoveryBaseUrl,
  endpointCandidates,
  HttpError,
  isAuthError,
  normalizeBaseUrl,
} from './sync-url';

describe('sync url helpers', () => {
  test('normalizeBaseUrl trims, strips trailing slashes, and defaults to https', () => {
    expect(normalizeBaseUrl('  desktop.local:34129/  ')).toBe('https://desktop.local:34129');
    expect(normalizeBaseUrl('http://192.168.1.4:34129///')).toBe('http://192.168.1.4:34129');
    expect(normalizeBaseUrl('https://x.ts.net')).toBe('https://x.ts.net');
    expect(normalizeBaseUrl('   ')).toBe('');
  });

  test('discoveryBaseUrl wraps IPv6 hosts in brackets and uses plain http', () => {
    expect(discoveryBaseUrl({ host: '192.168.1.4', port: 34129 } as never)).toBe(
      'http://192.168.1.4:34129',
    );
    expect(discoveryBaseUrl({ host: 'fe80::1', port: 34129 } as never)).toBe(
      'http://[fe80::1]:34129',
    );
    expect(discoveryBaseUrl({ host: '[fe80::1]', port: 34129 } as never)).toBe(
      'http://[fe80::1]:34129',
    );
  });

  test('endpointCandidates prefers tailnet and dedupes empty/overlapping entries', () => {
    expect(
      endpointCandidates({ tailscaleUrl: 'https://x.ts.net', lanUrl: 'http://1.2.3.4:1' }),
    ).toEqual(['https://x.ts.net', 'http://1.2.3.4:1']);
    expect(endpointCandidates({ tailscaleUrl: null, lanUrl: null })).toEqual([]);
    expect(
      endpointCandidates({ tailscaleUrl: 'https://same', lanUrl: 'https://same' }),
    ).toEqual(['https://same']);
  });

  test('isAuthError reads the response status off an HttpError, not message text', () => {
    expect(isAuthError(new HttpError('페어링 토큰이 필요합니다.', 401))).toBe(true);
    // A 401 whose server message happens to look like something else.
    expect(isAuthError(new HttpError('Desktop 요청 실패 (500)', 401))).toBe(true);
    expect(isAuthError(new HttpError('서버 오류', 500))).toBe(false);
    expect(isAuthError(new HttpError('요청 과다', 429))).toBe(false);
    // Plain errors and non-error values are never auth failures.
    expect(isAuthError(new Error('Desktop 요청 실패 (401)'))).toBe(false);
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError(undefined)).toBe(false);
    expect(isAuthError('Desktop 요청 실패 (401)')).toBe(false);
    expect(isAuthError({ status: 401 })).toBe(false);
  });

  test('HttpError carries the HTTP status for callers that branch on it', () => {
    const error = new HttpError('토큰 만료', 403);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('HttpError');
    expect(error.status).toBe(403);
    expect(error.message).toBe('토큰 만료');
  });
});
