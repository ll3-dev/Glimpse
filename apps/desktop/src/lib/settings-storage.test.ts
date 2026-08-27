import { describe, expect, test, mock, beforeEach } from 'bun:test';

/**
 * 데스크톱 설정 저장의 키 분리 검증.
 *
 * Tauri 런타임에서는 API 키가 keyring(set_secret 커맨드)에만 저장되고
 * localStorage 에는 키 없는 설정이 남는다. 웹 프리뷰(비 Tauri)는
 * 종전대로 localStorage 를 쓴다.
 */

const keychain = new Set<string>();

const invokeMock = mock(async (cmd: string, args?: { secret?: string }) => {
  if (cmd === 'set_secret') {
    keychain.add(args?.secret ?? '');
  }
  if (cmd === 'delete_secret') {
    keychain.clear();
  }
  if (cmd === 'get_secret') {
    return keychain.size ? [...keychain][0] : null;
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

mock.module('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

const storage = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => void storage.clear(),
};
(globalThis as Record<string, unknown>).localStorage = localStorageStub;

describe('settings-storage 키 분리', () => {
  beforeEach(() => {
    storage.clear();
    keychain.clear();
    invokeMock.mockClear();
  });

  test('Tauri 런타임에서 localStorage 에 API 키가 남지 않는다', async () => {
    setTauriWindow(true);
    const { saveSettings, loadSettings } = await import('./settings-storage');

    await saveSettings({
      aiProvider: 'byok',
      byok: {
        provider: 'openai',
        apiKey: 'sk-secret-value',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      },
      localLlm: { enabled: false, selectedModel: null },
    });

    // 키체인에 저장됨
    expect(invokeMock.mock.calls.some((c) => c[0] === 'set_secret')).toBe(true);

    // localStorage 원문에 키 없음
    const raw = storage.get('glimpse_desktop_settings_v1') ?? '';
    expect(raw).not.toContain('sk-secret-value');

    // loadSettings 는 키를 빈 값으로 로드
    const loaded = loadSettings();
    expect(loaded.byok.apiKey).toBe('');

    setTauriWindow(false);
  });

  test('빈 키 저장은 keyring 삭제로 처리된다', async () => {
    setTauriWindow(true);
    const { saveSettings } = await import('./settings-storage');

    await saveSettings({
      aiProvider: 'rules',
      byok: { provider: 'openai', apiKey: '', baseUrl: '', model: '' },
      localLlm: { enabled: false, selectedModel: null },
    });

    expect(invokeMock.mock.calls.some((c) => c[0] === 'delete_secret')).toBe(true);
    setTauriWindow(false);
  });

  test('레거시 localStorage 평문 키는 이관 대상이 된다', async () => {
    setTauriWindow(true);
    // 레거시 상태 시딩
    storage.set(
      'glimpse_desktop_settings_v1',
      JSON.stringify({
        aiProvider: 'byok',
        byok: { provider: 'openai', apiKey: 'sk-legacy-plain', baseUrl: '', model: '' },
        localLlm: { enabled: false, selectedModel: null },
      }),
    );

    const { loadSettings } = await import('./settings-storage');
    const loaded = loadSettings();

    // 로드된 설정에서 키는 제거되어 있다
    expect(loaded.byok.apiKey).toBe('');

    // 이관(fire-and-forget)이 실행됐을 때 원문 키는 사라진다 —
    // 마이그레이션 완료를 기다렸다 확인
    await new Promise((r) => setTimeout(r, 20));
    const raw = storage.get('glimpse_desktop_settings_v1') ?? '';
    expect(raw).not.toContain('sk-legacy-plain');
    expect(invokeMock.mock.calls.some((c) => c[0] === 'set_secret')).toBe(true);

    setTauriWindow(false);
  });

  test('구 레거시 키(glimpse-desktop-settings)의 평문 키는 이관 후 삭제된다', async () => {
    setTauriWindow(true);
    // 구버전 포맷의 레거시 키 시딩 — V1 키는 없음
    storage.set(
      'glimpse-desktop-settings',
      JSON.stringify({
        aiProvider: 'byok',
        byok: { provider: 'openai', apiKey: 'sk-old-plaintext', baseUrl: '', model: '' },
        localLlm: { enabled: false, selectedModel: null },
      }),
    );

    const { loadSettings, loadApiKey } = await import('./settings-storage');
    loadSettings();

    // 이관(fire-and-forget) 완료 대기
    await new Promise((r) => setTimeout(r, 20));

    // 키체인으로 이관됐고
    expect(invokeMock.mock.calls.some((c) => c[0] === 'set_secret')).toBe(true);
    const key = await loadApiKey('openai');
    expect(key).toBe('sk-old-plaintext');

    // 레거시 키는 localStorage 에서 완전히 제거 — 평문 잔존 차단
    expect(storage.has('glimpse-desktop-settings')).toBe(false);

    setTauriWindow(false);
  });
});
