import { describe, expect, test } from 'bun:test';
import { discoveryBaseUrl, endpointCandidates, isAuthErrorMessage, normalizeBaseUrl } from './sync-url';

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

  test('isAuthErrorMessage matches only 401 status messages', () => {
    expect(isAuthErrorMessage('Desktop 요청 실패 (401)')).toBe(true);
    expect(isAuthErrorMessage('Desktop 요청 실패 (500)')).toBe(false);
    expect(isAuthErrorMessage('연결 시간이 초과되었습니다.')).toBe(false);
  });
});
