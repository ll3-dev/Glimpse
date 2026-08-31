import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { tauriCoreMocks } from '../../../test/tauri-core-mock';

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
// 부분 mock(invoke만)은 프로세스 전역 오염으로 이후 테스트의 event.js 로드를
// 깨뜨린다 — transformCallback 등 나머지 export를 포함한 완전 mock을 쓴다.
mock.module('@tauri-apps/api/core', () => tauriCoreMocks(invokeMock));

// Tauri 런타임 감지 — loadSettings 가 키체인을 쓰게
(globalThis as Record<string, unknown>).window = { __TAURI_INTERNALS__: {} };

function streamingResponse(status: number): Response {
  return new Response('err', { status });
}

/** abort 신호를 존중하는 hanging fetch — 타임아웃 분류 검증용(모바일과 동일 접근). */
function createSignalAwareHangingFetch(): typeof fetch {
  return ((url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    })) as unknown as typeof fetch;
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

describe('BYOK 타임아웃', () => {
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

  test('complete() 무한 대기 요청은 AI_PROVIDER_TIMEOUT로 분류되어 throw', async () => {
    const { createBYOKProvider } = await import('./byok-provider');
    const provider = createBYOKProvider({
      provider: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o-mini',
      fetchFn: createSignalAwareHangingFetch(),
      timeoutMs: 20,
    });

    let thrown: unknown = null;
    try {
      await provider.complete({ prompt: 'hi' });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).not.toBeNull();
    const err = thrown as { code?: string };
    expect(err.code).toBe('AI_PROVIDER_TIMEOUT');
  });

  test('complete() AbortSignal.timeout 없이도 동작한다 — 회귀 방지', async () => {
    // 모바일과 동일: RN polyfill에는 AbortSignal.timeout가 없다. 데스크톱은
    // Tauri 웹뷰라 존재하지만, realm 이식성을 위해 플래그 패턴을 유지한다.
    const signalStatic = AbortSignal as unknown as { timeout?: unknown };
    const originalTimeout = signalStatic.timeout;
    delete signalStatic.timeout;

    try {
      const { createBYOKProvider } = await import('./byok-provider');
      const provider = createBYOKProvider({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
        fetchFn: createSignalAwareHangingFetch(),
        timeoutMs: 20,
      });

      let thrown: unknown = null;
      try {
        await provider.complete({ prompt: 'hi' });
      } catch (e) {
        thrown = e;
      }

      expect(thrown).not.toBeNull();
      expect((thrown as { code?: string }).code).toBe('AI_PROVIDER_TIMEOUT');
    } finally {
      signalStatic.timeout = originalTimeout;
    }
  });

  test('completeBYOKStream() 멍텅구리 fetch는 null 폴백 — 비스트리밍으로 강등', async () => {
    const { completeBYOKStream } = await import('./byok-provider');
    const started = Date.now();

    const result = await completeBYOKStream(
      [{ role: 'user', content: 'hi' }],
      { onToken: () => {}, onDone: () => {} },
      {
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
        fetchFn: createSignalAwareHangingFetch(),
        timeoutMs: 20,
      },
    );

    expect(result).toBeNull();
    // 타임아웃 경계에서 잘랐다 — 30초 기본값을 기다리지 않는다
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  test('비스트리밍 프로바이더(google — buildStreamBody 없음)는 fetch 전에 즉시 null', async () => {
    const { completeBYOKStream } = await import('./byok-provider');
    const fetchMock = mock(async () => streamingResponse(200));

    const result = await completeBYOKStream(
      [{ role: 'user', content: 'hi' }],
      { onToken: () => {}, onDone: () => {} },
      {
        provider: 'google',
        apiKey: 'g-key',
        model: 'gemini-pro',
        fetchFn: fetchMock as unknown as typeof fetch,
        timeoutMs: 20,
      },
    );

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
