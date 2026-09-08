import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

/**
 * 로컬 서버 tool-calling 왕복 — OpenAI 포맷 파싱과 null 폴백 계약.
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

describe('completeLocalServerWithTools', () => {
  test('tool_calls 응답을 파싱해 도구 호출 목록을 돌려준다', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: 'call-1',
                    function: { name: 'search_knowledge', arguments: '{"query":"rust"}' },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      )) as typeof fetch;

    const { completeLocalServerWithTools } = await import('./local-server-tools');
    const result = await completeLocalServerWithTools(
      [{ role: 'user', content: 'rust 정리해줘' }],
      [],
    );

    expect(result).toEqual({
      kind: 'tool_calls',
      toolCalls: [{ id: 'call-1', name: 'search_knowledge', arguments: '{"query":"rust"}' }],
    });
  });

  test('tool_calls 가 없으면 최종 텍스트로 돌려준다', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: '완료된 답변' } }] }),
        { status: 200 },
      )) as typeof fetch;

    const { completeLocalServerWithTools } = await import('./local-server-tools');
    const result = await completeLocalServerWithTools([{ role: 'user', content: 'hi' }], []);
    expect(result).toEqual({ kind: 'text', text: '완료된 답변' });
  });

  test('baseUrl 미설정은 null — 도구 없이 RAG 경로로 폴백', async () => {
    seedSettings('', '');
    const { completeLocalServerWithTools } = await import('./local-server-tools');
    expect(await completeLocalServerWithTools([{ role: 'user', content: 'hi' }], [])).toBeNull();
  });

  test('실패 응답/네트워크 오류는 null 폴백 — 로컬 서버에는 인증 throw 경로가 없다', async () => {
    globalThis.fetch = (async () => new Response('err', { status: 500 })) as typeof fetch;
    const { completeLocalServerWithTools } = await import('./local-server-tools');
    expect(await completeLocalServerWithTools([{ role: 'user', content: 'hi' }], [])).toBeNull();

    globalThis.fetch = (async () => {
      throw new Error('connection refused');
    }) as typeof fetch;
    expect(await completeLocalServerWithTools([{ role: 'user', content: 'hi' }], [])).toBeNull();
  });

  test('타임아웃도 null 폴백', async () => {
    globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      })) as typeof fetch;
    const { completeLocalServerWithTools } = await import('./local-server-tools');
    expect(
      await completeLocalServerWithTools([{ role: 'user', content: 'hi' }], [], {
        timeoutMs: 10,
      }),
    ).toBeNull();
  });
});
