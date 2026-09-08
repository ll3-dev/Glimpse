import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { TodaySummary } from '@glimpse/features';
import type { AIProvider } from '@/features/ai/types';
import { generateDailyNarrative, getCachedDailyNarrative, setCachedDailyNarrative } from './generate-daily-narrative';

/**
 * 데스크톱 오늘 요약 내러티브 생성 — provider DI로 라우팅/캐시 계약 검증.
 */

const store = new Map<string, string>();
const localStorageStub = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => void store.clear(),
};

function makeSummary(overrides?: Partial<TodaySummary>): TodaySummary {
  return {
    captureCount: 2,
    captures: [
      { id: 'a', title: 'Rust 소유권 노트', preview: '메모', type: 'note', createdAt: 1 },
      { id: 'b', title: 'Tauri 동기화 메모', preview: '메모', type: 'note', createdAt: 2 },
    ],
    newConnectionCount: 2,
    ...overrides,
  };
}

function providerOf(kind: AIProvider['kind'], text = '회고 문단'): AIProvider {
  return {
    kind,
    isAvailable: async () => true,
    complete: async () => ({ text, provider: kind }),
    generateMetadata: async () => ({ summary: text, tags: [] }),
  };
}

function seedProvider(kind: 'managed-llm' | 'local-server' | 'rules') {
  store.set(
    'glimpse_desktop_settings_v1',
    JSON.stringify({
      aiProvider: kind,
      localServer: { baseUrl: '', model: '', detectedFrom: 'manual' },
      localLlm: { enabled: false, selectedModel: null },
      chat: { ragEnabled: true, toolsEnabled: true },
    }),
  );
}

const originalWindow = (globalThis as { window?: unknown }).window;

beforeEach(() => {
  (globalThis as Record<string, unknown>).localStorage = localStorageStub;
  delete (globalThis as { window?: unknown }).window;
  store.clear();
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
  // bun test는 단일 프로세스 — window를 지운 채 두면 이후 파일의
  // uniwind 로드가 깨지므로 반드시 복원한다.
  if (originalWindow !== undefined) {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

describe('generateDailyNarrative (desktop)', () => {
  test('지원 프로바이더면 생성하고 캐시에 남긴다', async () => {
    seedProvider('managed-llm');
    const narrative = await generateDailyNarrative(makeSummary(), {
      getProvider: async () => providerOf('managed-llm', '오늘 Rust와 Tauri 메모를 남겼다.'),
    });

    expect(narrative).toBe('오늘 Rust와 Tauri 메모를 남겼다.');
    expect(getCachedDailyNarrative()).toBe(narrative);
  });

  test('rules 프로바이더면 요청하지 않고 null — 조용한 폴백', async () => {
    seedProvider('rules');
    let requested = false;
    const narrative = await generateDailyNarrative(makeSummary(), {
      getProvider: async () => {
        requested = true;
        return providerOf('rules');
      },
    });

    expect(narrative).toBeNull();
    expect(requested).toBe(false);
  });

  test('폴백 체인이 rules/stub로 떨어지면 null — 로컬 모델 미로드', async () => {
    seedProvider('managed-llm');
    const narrative = await generateDailyNarrative(makeSummary(), {
      getProvider: async () => providerOf('stub'),
    });
    expect(narrative).toBeNull();
  });

  test('캡처 0건이면 생성을 생략한다', async () => {
    seedProvider('managed-llm');
    let requested = false;
    const narrative = await generateDailyNarrative(
      makeSummary({ captureCount: 0, captures: [], newConnectionCount: 0 }),
      {
        getProvider: async () => {
          requested = true;
          return providerOf('managed-llm');
        },
      },
    );

    expect(narrative).toBeNull();
    expect(requested).toBe(false);
  });

  test('프로바이더 실패는 문단 숨김으로 흡수된다', async () => {
    seedProvider('managed-llm');
    const failing: AIProvider = {
      kind: 'managed-llm',
      isAvailable: async () => true,
      complete: async () => {
        throw new Error('model not loaded');
      },
      generateMetadata: async () => ({ summary: '', tags: [] }),
    };

    expect(
      await generateDailyNarrative(makeSummary(), { getProvider: async () => failing }),
    ).toBeNull();
  });

  test('다른 날 키의 캐시는 읽히지 않는다', () => {
    setCachedDailyNarrative('어제의 회고', '2000-01-01');
    expect(getCachedDailyNarrative('2000-01-01')).toBe('어제의 회고');
    expect(getCachedDailyNarrative()).toBeNull();
  });
});
