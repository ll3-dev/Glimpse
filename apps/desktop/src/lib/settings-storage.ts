const SETTINGS_KEY_V1 = 'glimpse_desktop_settings_v1';
const LEGACY_SETTINGS_KEY = 'glimpse-desktop-settings';

export interface DesktopSettings {
  aiProvider: 'local-llm' | 'byok' | 'rules';
  byok: {
    provider: 'openai' | 'deepseek' | 'custom';
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  localLlm: {
    enabled: boolean;
    selectedModel: string | null;
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
};

export function loadSettings(): DesktopSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY_V1) ?? localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<DesktopSettings>;
    return {
      aiProvider: parsed.aiProvider ?? DEFAULT_SETTINGS.aiProvider,
      byok: { ...DEFAULT_SETTINGS.byok, ...parsed.byok },
      localLlm: { ...DEFAULT_SETTINGS.localLlm, ...parsed.localLlm },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: DesktopSettings): void {
  localStorage.setItem(SETTINGS_KEY_V1, JSON.stringify(settings));
}
