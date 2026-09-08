import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

/**
 * 로컬 서버 프로바이더 — OpenAI 호환 단일 포맷 왕복 검증.
 *
 * 구 BYOK에서 전용된 모듈이다: Authorization 헤더가 없고(로컬 서버는
 * 무인증), baseUrl 은 settings.localServer 에서 온다.
 */

const store = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => void store.clear(),
};

const originalFetch = globalThis.fetch;
const originalWindow = (globalThis as { window?: unknown }).window;

function seedSettings(baseUrl: string, model: string) {
  store.set(
    'glimpse_desktop_settings_v1',
    JSON.stringify({
      aiProvider: 'local-server',
      localServer: { baseUrl, model, detectedFrom: 'manual' },
      localLlm: { enabled: false, selectedModel: null },
      chat: { ragEnabled: true, toolsEnabled: true },
    }),
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 영원히 대기하되 abort 시그널은 존중하는 fetch — 실제 fetch의 좀비 커넥션 재현 */
function hungFetch(): typeof fetch {
  return ((_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    })) as typeof fetch;
}

beforeEach(() => {
  (globalThis as Record<string, unknown>).localStorage = localStorageStub;
  delete (globalThis as { window?: unknown }).window;
  store.clear();
  seedSettings('http://localhost:1234', 'qwen3-8b');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow !== undefined) {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

describe('createLocalServerProvider.complete', () => {
  test('OpenAI 호환 요청을 로컬 서버로 보내고 응답 텍스트를 파싱한다', async () => {
    const requests: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init: init ?? {} });
      return jsonResponse({
        choices: [{ message: { content: '요약 문장' } }],
      });
    }) as typeof fetch;

    const { createLocalServerProvider } = await import('./local-server-provider');
    const provider = createLocalServerProvider();
    const response = await provider.complete({
      prompt: '내용 요약해줘',
      systemPrompt: '요약 도우미',
      maxTokens: 64,
    });

    expect(response.text).toBe('요약 문장');
    expect(response.provider).toBe('local-server');

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('http://localhost:1234/chat/completions');
    const body = JSON.parse(String(requests[0].init.body));
    expect(body.model).toBe('qwen3-8b');
    expect(body.messages).toEqual([
      { role: 'system', content: '요약 도우미' },
      { role: 'user', content: '내용 요약해줘' },
    ]);
    // 로컬 서버는 무인증 — Authorization 헤더가 없어야 한다
    const headers = requests[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  test('모델이 비면 요청에서 model 필드를 생략한다(서버 기본 모델)', async () => {
    seedSettings('http://localhost:1234', '');
    let capturedBody: Record<string, unknown> = {};
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse({ choices: [{ message: { content: 'ok' } }] });
    }) as typeof fetch;

    const { createLocalServerProvider } = await import('./local-server-provider');
    await createLocalServerProvider().complete({ prompt: 'hi' });
    expect('model' in capturedBody).toBe(false);
  });

  test('타임아웃은 AI_PROVIDER_TIMEOUT 으로 throw 한다', async () => {
    globalThis.fetch = hungFetch();

    const { createLocalServerProvider } = await import('./local-server-provider');
    const provider = createLocalServerProvider({ timeoutMs: 10 });
    let thrown: unknown = null;
    try {
      await provider.complete({ prompt: 'hi' });
    } catch (e) {
      thrown = e;
    }
    expect((thrown as { code?: string })?.code).toBe('AI_PROVIDER_TIMEOUT');
  });

  test('빈 응답은 AI_PROVIDER_INVALID_RESPONSE 로 throw 한다', async () => {
    globalThis.fetch = (async () => jsonResponse({ choices: [{ message: { content: '' } }] })) as typeof fetch;

    const { createLocalServerProvider } = await import('./local-server-provider');
    let thrown: unknown = null;
    try {
      await createLocalServerProvider().complete({ prompt: 'hi' });
    } catch (e) {
      thrown = e;
    }
    expect((thrown as { code?: string })?.code).toBe('AI_PROVIDER_INVALID_RESPONSE');
  });

  test('baseUrl 미설정은 AI_PROVIDER_UNAVAILABLE 로 throw 한다', async () => {
    seedSettings('', '');
    const { createLocalServerProvider } = await import('./local-server-provider');
    let thrown: unknown = null;
    try {
      await createLocalServerProvider().complete({ prompt: 'hi' });
    } catch (e) {
      thrown = e;
    }
    expect((thrown as { code?: string })?.code).toBe('AI_PROVIDER_UNAVAILABLE');
  });
});

describe('createLocalServerProvider.isAvailable', () => {
  test('설정 프로바이더가 local-server 이고 baseUrl 이 있으면 true', async () => {
    const { createLocalServerProvider } = await import('./local-server-provider');
    expect(await createLocalServerProvider().isAvailable()).toBe(true);

    seedSettings('', '');
    expect(await createLocalServerProvider().isAvailable()).toBe(false);
  });

  test('주입 config 는 baseUrl 유무만 본다', async () => {
    const { createLocalServerProvider } = await import('./local-server-provider');
    expect(await createLocalServerProvider({ baseUrl: 'http://localhost:8080' }).isAvailable()).toBe(true);
    expect(await createLocalServerProvider({ baseUrl: '' }).isAvailable()).toBe(false);
  });
});

describe('completeLocalServerStream', () => {
  function sseResponse(chunks: string[]): Response {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
    return new Response(stream, { status: 200 });
  }

  test('SSE 델타 토큰을 모아 onToken 으로 흘려보낸다', async () => {
    globalThis.fetch = (async () =>
      sseResponse([
        'data: {"choices":[{"delta":{"content":"안녕"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"하세요"}}]}\n\n',
        'data: [DONE]\n\n',
      ])) as typeof fetch;

    const { completeLocalServerStream } = await import('./local-server-provider');
    const tokens: string[] = [];
    let done: string | null = null;
    const fullText = await completeLocalServerStream(
      [{ role: 'user', content: 'hi' }],
      {
        onToken: (t) => tokens.push(t),
        onDone: (t) => {
          done = t;
        },
        onError: () => {},
      },
    );

    expect(tokens).toEqual(['안녕', '하세요']);
    expect(fullText).toBe('안녕하세요');
    expect(done).toBe('안녕하세요');
  });

  test('실패 응답은 null 폴백 — 비스트리밍 경로로 강등된다', async () => {
    globalThis.fetch = (async () => new Response('boom', { status: 500 })) as typeof fetch;

    const { completeLocalServerStream } = await import('./local-server-provider');
    const result = await completeLocalServerStream([{ role: 'user', content: 'hi' }], {
      onToken: () => {},
      onDone: () => {},
      onError: () => {},
    });
    expect(result).toBeNull();
  });
});
