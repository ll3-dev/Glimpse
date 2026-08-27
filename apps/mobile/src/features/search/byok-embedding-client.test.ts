import { describe, expect, test } from 'bun:test';
import {
  buildEmbeddingsUrl,
  embedBatchWithBYOK,
  providerSupportsEmbedding,
} from './byok-embedding-client';

/**
 * BYOK 임베딩 클라이언트 계약:
 * - provider 능력 판정(openai만 통과, anthropic/google은 미지원)
 * - openai-compatible /embeddings 배열 input 단일 요청 + index 순 복원
 * - HTTP 오류/불량 응답/부분 실패는 reject(상위 키워드 폴백 트리거)
 */

const config = {
  provider: 'openai' as const,
  apiKey: 'sk-test',
  baseUrl: 'https://api.example.com/v1/',
  model: 'text-embedding-3-small',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('providerSupportsEmbedding', () => {
  test('openai만 embedding을 지원하고 anthropic/google/null은 거부한다', () => {
    expect(providerSupportsEmbedding('openai')).toBe(true);
    expect(providerSupportsEmbedding('anthropic')).toBe(false);
    expect(providerSupportsEmbedding('google')).toBe(false);
    expect(providerSupportsEmbedding(null)).toBe(false);
  });
});

describe('buildEmbeddingsUrl', () => {
  test('base URL 정규화 + /embeddings 접미사, null이면 기본값', () => {
    expect(buildEmbeddingsUrl('https://api.example.com/v1')).toBe(
      'https://api.example.com/v1/embeddings',
    );
    expect(buildEmbeddingsUrl('https://api.example.com/v1///')).toBe(
      'https://api.example.com/v1/embeddings',
    );
    expect(buildEmbeddingsUrl(null)).toBe('https://api.openai.com/v1/embeddings');
  });
});

describe('embedBatchWithBYOK', () => {
  test('배치 input 배열을 단일 POST로 보내고 index 순으로 벡터를 복원한다', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return jsonResponse({
        data: [
          { embedding: [3, 3], index: 2 },
          { embedding: [1, 1], index: 0 },
          { embedding: [2, 2], index: 1 },
        ],
      });
    }) as typeof fetch;

    const vectors = await embedBatchWithBYOK(
      config,
      [{ input: 'a' }, { input: 'b' }, { input: 'c' }],
      fetchImpl,
    );

    // 1회 호출
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.url).toBe('https://api.example.com/v1/embeddings');
    expect(call.init.method).toBe('POST');
    const headers = call.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk-test');

    const body = JSON.parse(String(call.init.body));
    expect(body.model).toBe(config.model);
    expect(body.input).toEqual(['a', 'b', 'c']);

    // 응답이 섞여 와도 요청 순서 보존
    expect(vectors.map((entry) => entry.vector)).toEqual([[1, 1], [2, 2], [3, 3]]);
  });

  test('빈 입력은 네트워크 호출 없이 [] 반환', async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      throw new Error('should not be called');
    }) as typeof fetch;
    expect(await embedBatchWithBYOK(config, [], fetchImpl)).toEqual([]);
    expect(called).toBe(false);
  });

  test('HTTP 오류는 reject된다', async () => {
    const fetchImpl = (async () => jsonResponse({ error: {} }, 401)) as typeof fetch;
    await expect(embedBatchWithBYOK(config, [{ input: 'a' }], fetchImpl)).rejects.toThrow(
      'HTTP 401',
    );
  });

  test('data 누락·개수 불일치·중복 index는 계약 위반으로 reject', async () => {
    const missingData = (async () => jsonResponse({})) as typeof fetch;
    await expect(embedBatchWithBYOK(config, [{ input: 'a' }], missingData)).rejects.toThrow();

    const wrongCount = (async () =>
      jsonResponse({ data: [{ embedding: [1], index: 0 }] })) as typeof fetch;
    await expect(
      embedBatchWithBYOK(config, [{ input: 'a' }, { input: 'b' }], wrongCount),
    ).rejects.toThrow();

    const duplicateIndex = (async () =>
      jsonResponse({ data: [{ embedding: [1], index: 0 }, { embedding: [2], index: 0 }] })) as typeof fetch;
    await expect(
      embedBatchWithBYOK(config, [{ input: 'a' }, { input: 'b' }], duplicateIndex),
    ).rejects.toThrow();
  });

  test('non-openai provider는 네트워크 전에 거부된다', async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonResponse({});
    }) as typeof fetch;
    await expect(
      embedBatchWithBYOK(
        { ...config, provider: 'anthropic' },
        [{ input: 'a' }],
        fetchImpl,
      ),
    ).rejects.toThrow('does not support embeddings');
    expect(called).toBe(false);
  });
});
