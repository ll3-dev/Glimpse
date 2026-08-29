const SETTINGS_KEY_V1 = 'glimpse_desktop_settings_v1';
const LEGACY_SETTINGS_KEY = 'glimpse-desktop-settings';
/** keyring account — provider 별 키를 분리해 교체/삭제가 독립적이게 */
const SECRET_ACCOUNT_PREFIX = 'byok-api-key';

export interface DesktopSettings {
  aiProvider: 'local-llm' | 'byok' | 'rules';
  byok: {
    provider: 'openai' | 'deepseek' | 'anthropic' | 'google' | 'custom';
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  localLlm: {
    enabled: boolean;
    selectedModel: string | null;
  };
  chat: {
    /** 채팅 응답에 저장한 지식을 자동 참조(RAG)할지 여부 */
    ragEnabled: boolean;
  };
}

const DEFAULT_SETTINGS: DesktopSettings = {
  aiProvider: 'rules',
  byok: {
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  localLlm: {
    enabled: false,
    selectedModel: null,
  },
  chat: {
    ragEnabled: true,
  },
};

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function readRawSettings(): Partial<DesktopSettings> | null {
  try {
    const raw =
      localStorage.getItem(SETTINGS_KEY_V1) ?? localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<DesktopSettings>;
  } catch {
    return null;
  }
}

/**
 * Load settings (sync). API 키는 여기에 포함되지 않는다 — 키체인에서
 * 읽는 loadApiKey() 를 사용한다. 레거시 localStorage 평문 키가 남아
 * 있으면 키체인으로 이관을 시작한다(fire-and-forget).
 */
export function loadSettings(): DesktopSettings {
  const parsed = readRawSettings();
  if (!parsed) {
    void migrateLegacyApiKey();
    return { ...DEFAULT_SETTINGS };
  }

  // 레거시 평문 키 이관 — 저장된 settings 는 키를 더이상 포함하지 않는다
  const legacyKey = parsed.byok?.apiKey;
  if (legacyKey) {
    void migrateLegacyApiKey(legacyKey);
  }

  return {
    aiProvider: parsed.aiProvider ?? DEFAULT_SETTINGS.aiProvider,
    byok: {
      ...DEFAULT_SETTINGS.byok,
      ...parsed.byok,
      apiKey: '', // 키는 키체인 전용
    },
    localLlm: { ...DEFAULT_SETTINGS.localLlm, ...parsed.localLlm },
    chat: { ...DEFAULT_SETTINGS.chat, ...parsed.chat },
  };
}

/**
 * localStorage 에 평문 키가 남아 있는 경우 키체인으로 이관하고 제거한다.
 * 이관 실패 시 localStorage 값을 유지해 다음 기회에 재시도한다(키 손실 없음).
 */
async function migrateLegacyApiKey(explicitKey?: string): Promise<void> {
  if (!isTauriRuntime()) return;

  try {
    const parsed = readRawSettings();
    const legacyKey = explicitKey ?? parsed?.byok?.apiKey;
    if (!legacyKey) return;

    const provider = parsed?.byok?.provider ?? DEFAULT_SETTINGS.byok.provider;
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('set_secret', {
      account: secretAccount(provider),
      secret: legacyKey,
    });

    // 이관 성공 — localStorage 에서 키 제거
    if (parsed) {
      const sanitized: DesktopSettings = {
        aiProvider: parsed.aiProvider ?? DEFAULT_SETTINGS.aiProvider,
        byok: { ...DEFAULT_SETTINGS.byok, ...parsed.byok, apiKey: '' },
        localLlm: { ...DEFAULT_SETTINGS.localLlm, ...parsed.localLlm },
        chat: { ...DEFAULT_SETTINGS.chat, ...parsed.chat },
      };
      localStorage.setItem(SETTINGS_KEY_V1, JSON.stringify(sanitized));
    }
    // 레거시 키 전체 제거 — 이관 후에도 남아 있으면 평문 키가 디스크에
    // 영구 잔존한다. V1 sanitized 저장 후에 수행해 실패 시 재시도 보존.
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
  } catch {
    // 키체인 접근 실패 — localStorage 값 유지, 다음 시작에 재시도
  }
}

function secretAccount(provider: string): string {
  return `${SECRET_ACCOUNT_PREFIX}:${provider}`;
}

/**
 * 현재 provider 의 API 키를 키체인에서 읽는다(비동기).
 * 웹 프리뷰(비 Tauri)에서는 localStorage 폴백을 유지한다.
 */
export async function loadApiKey(provider: string): Promise<string> {
  if (!isTauriRuntime()) {
    const parsed = readRawSettings();
    return parsed?.byok?.apiKey ?? '';
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const secret = await invoke<string | null>('get_secret', {
      account: secretAccount(provider),
    });
    return secret ?? '';
  } catch {
    return '';
  }
}

/**
 * Save settings. Tauri 런타임에서는 API 키를 키체인에 쓰고
 * localStorage 에는 키를 제외한 설정만 남긴다.
 */
export async function saveSettings(settings: DesktopSettings): Promise<void> {
  if (isTauriRuntime()) {
    const { invoke } = await import('@tauri-apps/api/core');
    if (settings.byok.apiKey) {
      await invoke('set_secret', {
        account: secretAccount(settings.byok.provider),
        secret: settings.byok.apiKey,
      });
    } else {
      await invoke('delete_secret', {
        account: secretAccount(settings.byok.provider),
      });
    }
    const { apiKey: _excluded, ...byokWithoutKey } = settings.byok;
    void _excluded;
    localStorage.setItem(
      SETTINGS_KEY_V1,
      JSON.stringify({ ...settings, byok: byokWithoutKey }),
    );
    return;
  }

  // 웹 프리뷰 폴백 — 종전대로 localStorage 저장
  localStorage.setItem(SETTINGS_KEY_V1, JSON.stringify(settings));
}
