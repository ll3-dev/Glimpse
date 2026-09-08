import { describe, expect, test } from 'bun:test';
import type { DesktopSettings } from '@/lib/settings-storage';
import type { DesktopLLMOverview } from '@/features/local-llm/desktop-llm-service';
import {
  buildOnboardingSteps,
  isModelReady,
  onboardingComplete,
} from './onboarding-steps';

const settings = (overrides: Partial<DesktopSettings>): DesktopSettings => ({
  aiProvider: 'managed-llm',
  localServer: { baseUrl: '', model: '', detectedFrom: 'manual' },
  localLlm: { enabled: false, selectedModel: null },
  chat: { ragEnabled: true, toolsEnabled: true },
  ...overrides,
});

const overview = (
  statuses: DesktopLLMOverview['models'][number]['status'][],
): DesktopLLMOverview =>
  ({
    runtimes: [],
    models: statuses.map((status, index) => ({
      id: `model-${index}`,
      name: `Model ${index}`,
      family: 'test',
      quantization: 'q4',
      format: 'gguf',
      repo: 'r',
      filename: 'f.gguf',
      path: null,
      size: 1,
      contextLength: 4096,
      supportsEmbedding: false,
      supportsTools: false,
      status,
    })),
    health: {
      loadedModelId: null,
      runtimeId: null,
      status: 'idle',
    },
    memoryPolicy: {
      keepLastLoaded: false,
      autoUnloadMinutes: 10,
    },
  }) as unknown as DesktopLLMOverview;

describe('isModelReady', () => {
  test('rules 프로바이더는 모델 없이도 준비된 것이다', () => {
    expect(isModelReady(settings({ aiProvider: 'rules' }), undefined)).toBe(true);
  });

  test('local-server는 baseUrl이 있어야 준비된 것이다', () => {
    expect(
      isModelReady(
        settings({ aiProvider: 'local-server' }),
        undefined,
      ),
    ).toBe(false);
    expect(
      isModelReady(
        settings({
          aiProvider: 'local-server',
          localServer: { baseUrl: 'http://127.0.0.1:1234', model: '', detectedFrom: 'lmstudio' },
        }),
        undefined,
      ),
    ).toBe(true);
  });

  test('managed-llm은 다운로드 완료 모델이 하나라도 있으면 준비된 것이다', () => {
    expect(isModelReady(settings({}), overview(['not_downloaded']))).toBe(false);
    expect(isModelReady(settings({}), overview(['downloading', 'ready']))).toBe(true);
    expect(isModelReady(settings({}), overview(['active']))).toBe(true);
  });
});

describe('buildOnboardingSteps', () => {
  test('모델과 캡처가 모두 끝나면 온보딩은 완료다', () => {
    const steps = buildOnboardingSteps({
      settings: settings({}),
      modelOverview: overview(['ready']),
      itemCount: 3,
    });
    expect(onboardingComplete(steps)).toBe(true);
  });

  test('빈 보관함이면 첫 캡처 단계가 남는다', () => {
    const steps = buildOnboardingSteps({
      settings: settings({}),
      modelOverview: overview(['ready']),
      itemCount: 0,
    });
    expect(onboardingComplete(steps)).toBe(false);
    expect(steps.find((step) => step.id === 'capture')?.done).toBe(false);
  });

  test('모델이 없으면 첫 캡처가 있어도 모델 단계가 남는다', () => {
    const steps = buildOnboardingSteps({
      settings: settings({}),
      modelOverview: undefined,
      itemCount: 2,
    });
    expect(onboardingComplete(steps)).toBe(false);
    expect(steps.find((step) => step.id === 'model')?.done).toBe(false);
  });
});
