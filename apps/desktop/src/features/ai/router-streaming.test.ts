import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

/**
 * generateChatStreamResponse 빈 스트림 계약 테스트.
 *
 * bun의 mock.module은 프로세스 전역이라 실제 모듈이 필요한 다른 테스트
 * (byok-provider.test.ts, settings-storage.test.ts)와 충돌한다. 그래서
 * 여기서는 mock.module을 쓰지 않고 —
 *   1. 비(非)Tauri 런타임으로 세팅해 loadApiKey가 localStorage 폴백을 타게 하고
 *   2. globalThis.fetch를 "스트림 완료 + 토큰 0개" SSE 응답으로 교체해
 * router의 BYOK 스트리밍 분기를 실제 provider 모듈로 통과시킨다.
 *
 * 계약: 스트림이 정상 완료됐지만 텍스트가 비었으면 센티넬('[No response]')
 * 을 만들지 않고 reject 한다 — ChatView의 기존 에러 경로로 표시되도록.
 *
 * local-llm 스트림 분기는 같은 계약(동일 패턴의 throw)이지만 healthy
 * 런타임+빈 스트림 시나리오에 tauri invoke mock이 필요해 실모듈 테스트와
 * 충돌한다 — BYOK 경로 검증으로 대표한다.
 */

const originalFetch = globalThis.fetch;
// bun test는 같은 프로세스에서 모든 파일을 돌린다 — window를 지우면 이후에
// 평가되는 모듈(uniwind 등)이 깨지므로 afterEach에서 반드시 복원한다.
const originalWindow = (globalThis as { window?: unknown }).window;
const localStorageStub = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => void store.clear(),
};
const store = new Map<string, string>();

const BYOK_SETTINGS = JSON.stringify({
  aiProvider: 'byok',
  byok: {
    provider: 'openai',
    apiKey: 'sk-test',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  localLlm: { enabled: false, selectedModel: null },
  chat: { ragEnabled: false },
});

/** 정상 완료되지만 데이터 라인이 없는 SSE 응답 — 파싱 결과 토큰 0개. */
function emptySSEResponse(): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

beforeEach(() => {
  (globalThis as Record<string, unknown>).localStorage = localStorageStub;
  delete (globalThis as { window?: unknown }).window;
  store.clear();
  store.set('glimpse_desktop_settings_v1', BYOK_SETTINGS);
  globalThis.fetch = (async () => emptySSEResponse()) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow !== undefined) {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

describe('generateChatStreamResponse 빈 스트림 계약', () => {
  const noopCallbacks = {
    onToken: () => {},
    onDone: () => {},
    onError: () => {},
  };

  test('BYOK 스트림이 완료됐지만 비었으면 [No response] 대신 reject한다', async () => {
    const { generateChatStreamResponse } = await import('./router');

    let thrown: unknown = null;
    try {
      await generateChatStreamResponse([{ role: 'user', content: '질문' }], noopCallbacks);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).not.toBeNull();
    expect((thrown as Error).message).toContain('AI 응답이 비어');
  });
});
