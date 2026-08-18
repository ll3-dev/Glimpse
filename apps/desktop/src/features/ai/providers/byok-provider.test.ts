import { beforeEach, describe, expect, mock, test } from 'bun:test';

/**
 * BYOK 스트리밍 에러 매핑 검증.
 *
 * 스트리밍 요청이 401/403/429로 실패하면 비스트리밍 폴백(return null)이
 * 아니라 complete와 동일한 에러 코드로 즉시 throw 해야 한다 — 폴백은
 * 같은 이유로 재요청해 레이트 리밋을 2배 소모하고 키 문제를 감춘다.
 */

const storage = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => void storage.clear(),
};
(globalThis as Record<string, unknown>).localStorage = localStorageStub;

const invokeMock = mock(async (cmd: string, args?: { account?: string }) => {
  if (cmd === 'get_secret' && args?.account?.includes('openai')) {
    return 'sk-test';
  }
  return null;
});
mock.module('@tauri-apps/api/core', () => ({ invoke: invokeMock }));

// Tauri 런타임 감지 — loadSettings 가 키체인을 쓰게
(globalThis as Record<string, unknown>).window = { __TAURI_INTERNALS__: {} };

function streamingResponse(status: number): Response {
  return new Response('err', { status });
}

describe('BYOK 스트리밍 에러 매핑', () => {
  beforeEach(() => {
    storage.clear();
    storage.set(
      'glimpse_desktop_settings_v1',
      JSON.stringify({
        aiProvider: 'byok',
        byok: { provider: 'openai', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
        localLlm: { enabled: false, selectedModel: null },
      }),
    );
  });

  test('429는 폴백이 아니라 AI_PROVIDER_RATE_LIMITED throw', async () => {
    const { completeBYOKStream } = await import('./byok-provider');
    const fetchMock = mock(async () => streamingResponse(429));

    let thrown: unknown = null;
    try {
      await completeBYOKStream(
        [{ role: 'user', content: 'hi' }],
        { onToken: () => {}, onDone: () => {} },
        { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini', fetchFn: fetchMock as unknown as typeof fetch },
      );
    } catch (e) {
      thrown = e;
    }

    expect(thrown).not.toBeNull();
    const err = thrown as { code?: string };
    expect(err.code).toBe('AI_PROVIDER_RATE_LIMITED');
    // 재요청(폴백) 없이 단일 요청으로 끝나야 한다
    expect(fetchMock.mock.calls.length).toBe(1);
  });

  test('401은 AI_PROVIDER_UNAUTHORIZED throw', async () => {
    const { completeBYOKStream } = await import('./byok-provider');
    const fetchMock = mock(async () => streamingResponse(401));

    let thrown: unknown = null;
    try {
      await completeBYOKStream(
        [{ role: 'user', content: 'hi' }],
        { onToken: () => {}, onDone: () => {} },
        { provider: 'openai', apiKey: 'sk-bad', model: 'gpt-4o-mini', fetchFn: fetchMock as unknown as typeof fetch },
      );
    } catch (e) {
      thrown = e;
    }

    expect(thrown).not.toBeNull();
    const err = thrown as { code?: string };
    expect(err.code).toBe('AI_PROVIDER_UNAUTHORIZED');
  });

  test('500 등 기타 상태는 기존대로 null 폴백', async () => {
    const { completeBYOKStream } = await import('./byok-provider');
    const fetchMock = mock(async () => streamingResponse(500));

    const result = await completeBYOKStream(
      [{ role: 'user', content: 'hi' }],
      { onToken: () => {}, onDone: () => {} },
      { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini', fetchFn: fetchMock as unknown as typeof fetch },
    );

    expect(result).toBeNull();
  });
});
