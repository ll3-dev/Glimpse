import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { AIProvider, CompletionResponse } from './types';

/**
 * 라우터 채팅 응답 계약 테스트.
 *
 * chat-generation.test.ts 와 동일한 이유(모듈 mock의 프로세스 전역성)로 mock
 * 범위를 최소화한다: provider 선택 결과만 rules 로 고정하면 되므로
 * './providers/rules-provider' 만 mock.module 로 대체한다. router 를 실제로
 * import 하는 모듈은 이 테스트뿐이고(chat-generation은 router 자체를 mock),
 * rules-provider 를 import 하는 것도 router 뿐이라 누수 면이 없다.
 *
 * 설정은 실제 settings-storage 를 쓴다 — localStorage 에 aiProvider:'rules' 를
 * 써두면 loadSettings 기본 체인을 그대로 통과해 라우팅 분기까지 실 검증된다.
 */

const completeMock = mock(
  async (): Promise<CompletionResponse> => ({
    text: '',
    provider: 'rules',
  }),
);

const rulesProviderMock: AIProvider = {
  kind: 'rules',
  isAvailable: async () => true,
  complete: completeMock,
  generateMetadata: async () => ({ summary: '', tags: [] }),
};

mock.module('./providers/rules-provider', () => ({
  rulesProvider: rulesProviderMock,
}));

const storage = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => void storage.clear(),
};

const RULES_SETTINGS = JSON.stringify({
  aiProvider: 'rules',
  byok: { provider: 'openai', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  localLlm: { enabled: false, selectedModel: null },
  chat: { ragEnabled: false },
});

beforeEach(() => {
  storage.clear();
  storage.set('glimpse_desktop_settings_v1', RULES_SETTINGS);
  completeMock.mockImplementation(async () => ({ text: '', provider: 'rules' }));
  completeMock.mockClear();
});

describe('generateChatResponse 빈 응답 계약', () => {
  test('빈 응답은 가짜 답변을 만들지 않고 reject한다', async () => {
    const { generateChatResponse } = await import('./router');

    let thrown: unknown = null;
    try {
      await generateChatResponse([{ role: 'user', content: '소유권 질문' }]);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).not.toBeNull();
    expect((thrown as Error).message).toBe(
      'AI 응답이 비어 있습니다. 설정에서 다른 프로바이더를 선택해 주세요.',
    );
  });

  test('사용자 메시지가 없어도 빈 응답은 [No response] 대신 reject한다', async () => {
    const { generateChatResponse } = await import('./router');

    let thrown: unknown = null;
    try {
      await generateChatResponse([{ role: 'assistant', content: '안녕하세요' }]);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).not.toBeNull();
    expect((thrown as Error).message).toContain('AI 응답이 비어');
  });

  test('정상 응답은 Assistant: 접두어를 벗겨 그대로 돌려준다', async () => {
    const { generateChatResponse } = await import('./router');
    completeMock.mockImplementation(async () => ({
      text: 'Assistant: 소유권은 값의 소유 규칙입니다.',
      provider: 'rules',
    }));

    const result = await generateChatResponse([{ role: 'user', content: '소유권이 뭐야' }]);

    expect(result).toBe('소유권은 값의 소유 규칙입니다.');
  });

  test('rules provider가 선택되어 응답 텍스트를 받는다 — 라우팅 실검증', async () => {
    const { generateChatResponse } = await import('./router');
    completeMock.mockImplementation(async () => ({
      text: '응답 텍스트',
      provider: 'rules',
    }));

    const result = await generateChatResponse([
      { role: 'system', content: '시스템 지시' },
      { role: 'user', content: '질문' },
    ]);

    expect(result).toBe('응답 텍스트');
    // system 은 프롬프트가 아니라 systemPrompt 로 전달된다
    const request = completeMock.mock.calls[0][0];
    expect(request.systemPrompt).toBe('시스템 지시');
    expect(request.prompt).toBe('User: 질문');
  });
});
