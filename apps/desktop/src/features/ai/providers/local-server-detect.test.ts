import { describe, expect, test } from 'bun:test';

/**
 * 로컬 서버 자동 감지 — /v1/models 포트 프로브 검증.
 */

import { detectLocalServers, LOCAL_SERVER_PROBES } from './local-server-detect';

function modelsResponse(ids: string[]): Response {
  return new Response(JSON.stringify({ data: ids.map((id) => ({ id })) }), { status: 200 });
}

describe('detectLocalServers', () => {
  test('관례 포트 3종(LM Studio/Ollama/llama.cpp)을 프로브한다', () => {
    expect(LOCAL_SERVER_PROBES.map((p) => p.baseUrl)).toEqual([
      'http://localhost:1234',
      'http://localhost:11434',
      'http://localhost:8080',
    ]);
  });

  test('모델을 가진 서버만 감지 결과로 돌아온다', async () => {
    const fetchFn = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.startsWith('http://localhost:1234')) {
        return modelsResponse(['qwen3-8b', 'gemma-3-4b']);
      }
      if (u.startsWith('http://localhost:11434')) {
        return modelsResponse([]);
      }
      throw new Error('connection refused');
    }) as typeof fetch;

    const detected = await detectLocalServers({ fetchFn });
    expect(detected).toHaveLength(1);
    expect(detected[0]).toEqual({
      serverId: 'lmstudio',
      label: 'LM Studio',
      baseUrl: 'http://localhost:1234',
      models: ['qwen3-8b', 'gemma-3-4b'],
    });
  });

  test('비(非)정상 응답은 감지에서 제외된다', async () => {
    const fetchFn = (async () => new Response('err', { status: 500 })) as typeof fetch;
    expect(await detectLocalServers({ fetchFn })).toEqual([]);
  });

  test('좀비 커넥션은 타임아웃 플래그로 끊어내고 제외한다', async () => {
    const fetchFn = ((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      })) as typeof fetch;
    expect(await detectLocalServers({ fetchFn, timeoutMs: 10 })).toEqual([]);
  });
});
