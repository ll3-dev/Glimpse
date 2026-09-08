import { describe, expect, test, mock, beforeEach } from 'bun:test';
import { tauriCoreMocks } from '../test/tauri-core-mock';

/**
 * 데스크톱 설정 저장 — 완전 로컬 전환(2026-09-08) 이후 스키마 검증.
 *
 * 클라우드 BYOK는 제거되었다: 저장 시크릿이 없으므로 localStorage 단일
 * 저장이고, 레거시 BYOK 설정은 로드 시 새 스키마로 초기화되며 키체인의
 * 구 API 키는 삭제된다.
 */

const deletedAccounts: string[] = [];

const invokeMock = mock(async (cmd: string, args?: { account?: string }) => {
  if (cmd === 'delete_secret') {
    deletedAccounts.push(args?.account ?? '');
  }
  return null;
});

// window.__TAURI_INTERNALS__ 감지를 시뮬레이션
function setTauriWindow(present: boolean) {
  if (present) {
    (globalThis as Record<string, unknown>).window = {
      __TAURI_INTERNALS__: {},
    };
  } else {
    delete (globalThis as Record<string, unknown>).window;
  }
}

// 부분 mock(invoke만)은 프로세스 전역 오염으로 이후 테스트의 event.js 로드를
// 깨뜨린다 — 완전 mock 팩토리를 쓴다.
mock.module('@tauri-apps/api/core', () => tauriCoreMocks(invokeMock));

const storage = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => void storage.clear(),
};
(globalThis as Record<string, unknown>).localStorage = localStorageStub;

describe('settings-storage 완전 로컬 스키마', () => {
  beforeEach(() => {
    storage.clear();
    deletedAccounts.length = 0;
    invokeMock.mockClear();
  });

  test('기본 프로바이더는 managed-llm 이고 시크릿 필드가 없다', async () => {
    setTauriWindow(false);
    const { loadSettings } = await import('./settings-storage');

    const loaded = loadSettings();
    expect(loaded.aiProvider).toBe('managed-llm');
    expect(loaded.localServer).toEqual({ baseUrl: '', model: '', detectedFrom: 'manual' });
    expect(loaded.chat.ragEnabled).toBe(true);
    expect(loaded.chat.toolsEnabled).toBe(true);
  });

  test('saveSettings 는 localStorage 단일 저장 — 키체인 호출이 없다', async () => {
    setTauriWindow(true);
    const { saveSettings, loadSettings } = await import('./settings-storage');

    await saveSettings({
      aiProvider: 'local-server',
      localServer: { baseUrl: 'http://localhost:1234', model: 'qwen3-8b', detectedFrom: 'lmstudio' },
      localLlm: { enabled: false, selectedModel: null },
      chat: { ragEnabled: true, toolsEnabled: true },
    });

    expect(invokeMock.mock.calls.length).toBe(0);
    const loaded = loadSettings();
    expect(loaded.aiProvider).toBe('local-server');
    expect(loaded.localServer.baseUrl).toBe('http://localhost:1234');

    setTauriWindow(false);
  });

  test('구 프로바이더 값(local-llm/byok)은 managed-llm 로 정규화된다', async () => {
    setTauriWindow(false);
    storage.set(
      'glimpse_desktop_settings_v1',
      JSON.stringify({
        aiProvider: 'local-llm',
        localLlm: { enabled: true, selectedModel: null },
      }),
    );
    const { loadSettings } = await import('./settings-storage');
    expect(loadSettings().aiProvider).toBe('managed-llm');

    storage.set(
      'glimpse_desktop_settings_v1',
      JSON.stringify({ aiProvider: 'rules', localLlm: { enabled: false, selectedModel: null } }),
    );
    expect(loadSettings().aiProvider).toBe('rules');
  });

  test('레거시 BYOK 설정은 키체인 키 삭제와 함께 새 스키마로 초기화된다', async () => {
    setTauriWindow(true);
    // 마이그레이션 직전 상태 시딩 — byok 블록 포함 구포맷
    storage.set(
      'glimpse_desktop_settings_v1',
      JSON.stringify({
        aiProvider: 'byok',
        byok: { provider: 'openai', apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
        localLlm: { enabled: false, selectedModel: null },
        chat: { ragEnabled: true, toolsEnabled: true },
      }),
    );

    const { loadSettings, consumeByokRemovalNotice } = await import('./settings-storage');
    const loaded = loadSettings();
    expect(loaded.aiProvider).toBe('managed-llm');

    // 마이그레이션(fire-and-forget) 완료 대기 — 키체인의 BYOK 키 전량 삭제
    await new Promise((r) => setTimeout(r, 20));
    expect(deletedAccounts).toContain('byok-api-key:openai');
    expect(deletedAccounts).toContain('byok-api-key:anthropic');
    expect(deletedAccounts).toContain('byok-api-key:google');
    expect(deletedAccounts).toContain('byok-api-key:deepseek');
    expect(deletedAccounts).toContain('byok-api-key:custom');

    // 저장소에는 byok 블록이 더 이상 남지 않는다
    const raw = storage.get('glimpse_desktop_settings_v1') ?? '';
    expect(raw).not.toContain('byok');
    expect(raw).not.toContain('gpt-4o-mini');

    // 일회성 안내 플래그 — 첫 소비만 true
    expect(consumeByokRemovalNotice()).toBe(true);
    expect(consumeByokRemovalNotice()).toBe(false);

    setTauriWindow(false);
  });

  test('구 레거시 키(glimpse-desktop-settings)의 BYOK 설정도 같은 마이그레이션을 탄다', async () => {
    setTauriWindow(true);
    storage.set(
      'glimpse-desktop-settings',
      JSON.stringify({
        aiProvider: 'byok',
        byok: { provider: 'deepseek', apiKey: 'sk-old', baseUrl: '', model: '' },
        localLlm: { enabled: false, selectedModel: null },
      }),
    );

    const { loadSettings } = await import('./settings-storage');
    loadSettings();

    await new Promise((r) => setTimeout(r, 20));
    expect(storage.has('glimpse-desktop-settings')).toBe(false);
    expect(deletedAccounts.length).toBe(5);

    setTauriWindow(false);
  });
});

describe('settings-storage chat.ragEnabled', () => {
  beforeEach(() => {
    storage.clear();
    invokeMock.mockClear();
  });

  test('기본값은 true, 저장된 false는 로드 후에도 유지된다', async () => {
    setTauriWindow(false); // 웹 프리뷰 경로 — localStorage 직접 검증
    const { loadSettings } = await import('./settings-storage');

    // 저장된 값이 없으면 기본값 true
    expect(loadSettings().chat.ragEnabled).toBe(true);

    // chat 없이 저장된 구설정에서도 기본값 true로 병합된다
    storage.set(
      'glimpse_desktop_settings_v1',
      JSON.stringify({ aiProvider: 'rules', localLlm: { enabled: false, selectedModel: null } }),
    );
    expect(loadSettings().chat.ragEnabled).toBe(true);

    // 저장된 false는 유지된다
    storage.set(
      'glimpse_desktop_settings_v1',
      JSON.stringify({
        aiProvider: 'rules',
        localLlm: { enabled: false, selectedModel: null },
        chat: { ragEnabled: false },
      }),
    );
    expect(loadSettings().chat.ragEnabled).toBe(false);
  });
});
