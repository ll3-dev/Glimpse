/**
 * 데스크톱 설정 저장 — 완전 로컬 AI 런타임 스키마(2026-09-08 전환).
 *
 * 클라우드 BYOK(openai/anthropic/google/deepseek + API 키)는 제거되었다.
 * 프로바이더는 관리 런타임(llama.cpp GGUF) / 외부 로컬 서버(LM Studio·
 * Ollama·llama.cpp server의 OpenAI 호환 엔드포인트) / rules 3종뿐이며
 * 저장 시크릿이 없어 키체인 분리 저장 코드도 함께 제거되었다.
 */

const SETTINGS_KEY_V1 = 'glimpse_desktop_settings_v1';
const LEGACY_SETTINGS_KEY = 'glimpse-desktop-settings';
/** BYOK 제거 일회성 안내 플래그 — 설정 화면에서 1회만 표시한다 */
const BYOK_REMOVAL_NOTICE_KEY = 'glimpse_byok_removed_notice_v1';
/** 키체인에 남아 있을 수 있는 레거시 BYOK 키 계정 접두사 */
const LEGACY_SECRET_ACCOUNT_PREFIX = 'byok-api-key';
const LEGACY_SECRET_PROVIDERS = ['openai', 'anthropic', 'google', 'deepseek', 'custom'];

export type LocalServerSource = 'lmstudio' | 'ollama' | 'llamacpp' | 'manual';

export interface DesktopSettings {
  aiProvider: 'managed-llm' | 'local-server' | 'rules';
  localServer: {
    baseUrl: string;
    model: string;
    detectedFrom: LocalServerSource;
  };
  localLlm: {
    enabled: boolean;
    selectedModel: string | null;
  };
  chat: {
    /** 채팅 응답에 저장한 지식을 자동 참조(RAG)할지 여부 */
    ragEnabled: boolean;
    /** 채팅 AI가 라이브러리 검색/저장 도구를 쓸지 여부 (미지원 프로바이더는 무시) */
    toolsEnabled: boolean;
  };
}

const DEFAULT_SETTINGS: DesktopSettings = {
  aiProvider: 'managed-llm',
  localServer: {
    baseUrl: '',
    model: '',
    detectedFrom: 'manual',
  },
  localLlm: {
    enabled: false,
    selectedModel: null,
  },
  chat: {
    ragEnabled: true,
    toolsEnabled: true,
  },
};

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

interface RawStoredSettings extends Partial<Omit<DesktopSettings, 'localServer'>> {
  localServer?: Partial<DesktopSettings['localServer']>;
  /** 레거시 BYOK 블록 — 감지되면 일회성 마이그레이션 후 폐기한다 */
  byok?: unknown;
}

function readRawSettings(): RawStoredSettings | null {
  try {
    const raw =
      localStorage.getItem(SETTINGS_KEY_V1) ?? localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RawStoredSettings;
  } catch {
    return null;
  }
}

/** 저장된 프로바이더 값을 현행 스키마로 정규화 — 구값 'local-llm'/'byok' 폐기 */
function normalizeProvider(value: unknown): DesktopSettings['aiProvider'] {
  if (value === 'local-server' || value === 'rules') return value;
  return 'managed-llm';
}

/**
 * Load settings (sync). 저장 시크릿이 없으므로 로컬 읽기만으로 완결된다.
 * 레거시 BYOK 설정이 감지되면 새 스키마로 초기화하고(fire-and-forget)
 * 키체인에 남은 BYOK 키를 삭제한다.
 */
export function loadSettings(): DesktopSettings {
  const parsed = readRawSettings();
  if (!parsed) return { ...DEFAULT_SETTINGS };

  if (parsed.byok !== undefined) {
    void migrateAwayFromByok(parsed);
  }

  return {
    aiProvider: normalizeProvider(parsed.aiProvider),
    localServer: {
      baseUrl: parsed.localServer?.baseUrl ?? DEFAULT_SETTINGS.localServer.baseUrl,
      model: parsed.localServer?.model ?? DEFAULT_SETTINGS.localServer.model,
      detectedFrom: parsed.localServer?.detectedFrom ?? DEFAULT_SETTINGS.localServer.detectedFrom,
    },
    localLlm: { ...DEFAULT_SETTINGS.localLlm, ...parsed.localLlm },
    chat: { ...DEFAULT_SETTINGS.chat, ...parsed.chat },
  };
}

/**
 * BYOK 완전 제거 마이그레이션 — 소유자 1명 기준의 일회성 경로.
 * 새 스키마로 초기화된 설정을 저장하고, 키체인의 레거시 BYOK 키를 삭제한다.
 * 삭제 실패는 다음 시작의 재시도 기회를 남긴다(byok 블록이 저장소에 남는 동안).
 */
async function migrateAwayFromByok(parsed: RawStoredSettings): Promise<void> {
  const sanitized: DesktopSettings = {
    aiProvider: normalizeProvider(parsed.aiProvider),
    localServer: { ...DEFAULT_SETTINGS.localServer },
    localLlm: { ...DEFAULT_SETTINGS.localLlm, ...parsed.localLlm },
    chat: { ...DEFAULT_SETTINGS.chat, ...parsed.chat },
  };
  localStorage.setItem(SETTINGS_KEY_V1, JSON.stringify(sanitized));
  localStorage.removeItem(LEGACY_SETTINGS_KEY);
  localStorage.setItem(BYOK_REMOVAL_NOTICE_KEY, 'pending');

  if (!isTauriRuntime()) return;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await Promise.all(
      LEGACY_SECRET_PROVIDERS.map((provider) =>
        invoke('delete_secret', {
          account: `${LEGACY_SECRET_ACCOUNT_PREFIX}:${provider}`,
        }).catch(() => {
          // 계정이 없거나 키체인 접근 실패 — 다음 시작에 재시도된다
        }),
      ),
    );
  } catch {
    // 키체인 접근 실패 — 설정 초기화는 이미 완료, 키 삭제만 재시도 대상
  }
}

/**
 * BYOK 제거 일회성 안내 소비 — true를 돌려준 뒤 플래그를 소진시켜
 * 설정 화면의 안내 배너가 한 번만 나타나게 한다.
 */
export function consumeByokRemovalNotice(): boolean {
  if (localStorage.getItem(BYOK_REMOVAL_NOTICE_KEY) !== 'pending') return false;
  localStorage.setItem(BYOK_REMOVAL_NOTICE_KEY, 'shown');
  return true;
}

/** Save settings — 시크릿이 없으므로 localStorage 단일 저장으로 단순화되었다. */
export async function saveSettings(settings: DesktopSettings): Promise<void> {
  localStorage.setItem(SETTINGS_KEY_V1, JSON.stringify(settings));
}
