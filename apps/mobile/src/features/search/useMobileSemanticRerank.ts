import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import {
  useBYOKConfig,
  useBYOKCredentialsConfigured,
} from '@/src/features/settings/byok.selectors';
import { useSemanticRerankEnabled } from '@/src/features/search/semantic-settings';
import {
  embedBatchWithBYOK,
  providerSupportsEmbedding,
} from '@/src/features/search/byok-embedding-client';
import { createOnDeviceEmbedder } from '@/src/features/search/on-device-embedder';
import { useStore } from 'zustand';
import { onDeviceEmbeddingStore } from '@/src/features/search/on-device-embedding-model';
import {
  useSemanticRerank,
  type SemanticEmbedDeps,
} from '@glimpse/hooks';
import type { BYOKProviderType } from '@/src/stores/settings/byok.store';
import type { KnowledgeItem } from '@glimpse/shared';

/**
 * Mobile wiring for the platform-neutral semantic rerank hook.
 *
 * 결정 순서: (1) BYOK 구성 + provider가 embedding 지원 → 원격 배치 호출.
 * (2) 아니고 온디바이스 nomic 모델 다운로드 완료 → llama.rn 전용 컨텍스트로
 * 기기 내 임베딩. (3) 둘 다 아니면 null — 키워드 순서 pass-through.
 */

const DEFAULT_MODEL_FALLBACK = 'text-embedding-3-small';

interface RerankConfigSnapshot {
  provider: BYOKProviderType | null;
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
}

function createByokEmbedDeps(
  active: boolean,
  config: RerankConfigSnapshot,
): SemanticEmbedDeps {
  return {
    async resolveEmbeddingTarget() {
      if (!active || !config.provider || !config.apiKey) return null;
      if (!providerSupportsEmbedding(config.provider)) return null;
      return {
        runtimeId: 'byok-openai',
        modelId: config.model || DEFAULT_MODEL_FALLBACK,
      };
    },
    async embedBatch(requests) {
      if (!config.provider || !config.apiKey) {
        throw new Error('BYOK credentials missing');
      }
      return embedBatchWithBYOK(
        {
          provider: config.provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model || DEFAULT_MODEL_FALLBACK,
        },
        requests,
      );
    },
  };
}

/**
 * 모듈 수준 임베딩 인스턴스 — 재렌더·화면 전환과 무관하게 컨텍스트를
 * 재사용하고, 백그라운드 진입 시 여기서 release한다.
 */
let activeEmbedder: ReturnType<typeof createOnDeviceEmbedder> | null = null;
let activeEmbedderPath: string | null = null;

/**
 * 온디바이스 경로 — 동일 모델 경로엔 같은 컨텍스트를 돌려주고, 경로가
 * 바뀌면(모델 교체) 기존 것을 폐기한 뒤 새로 만든다.
 */
export function createOnDeviceEmbedDeps(modelPath: string): SemanticEmbedDeps {
  if (!activeEmbedder || activeEmbedderPath !== modelPath) {
    void activeEmbedder?.dispose();
    const embedder = createOnDeviceEmbedder({
      modelPath,
      modelId: modelPath.split('/').pop() || 'on-device-embedding',
    });
    activeEmbedder = embedder;
    activeEmbedderPath = modelPath;

    return {
      async resolveEmbeddingTarget() {
        if (!embedder.isReady()) return null;
        const fileName = modelPath.split('/').pop() || 'on-device-embedding';
        return { runtimeId: 'on-device-llama-rn', modelId: fileName };
      },
      async embedBatch(requests) {
        const vectors = await embedder.embedBatch(requests);
        if (vectors.length !== requests.length) {
          throw new Error(
            `온디바이스 임베딩 응답 수 불일치: ${vectors.length}/${requests.length}`,
          );
        }
        return vectors;
      },
    };
  }

  // 기존 인스턴스 재사용 — 모듈 참조를 다시 좁혀 non-null 보장
  const existing = activeEmbedder;
  return {
    async resolveEmbeddingTarget() {
      if (!existing.isReady()) return null;
      const fileName = modelPath.split('/').pop() || 'on-device-embedding';
      return { runtimeId: 'on-device-llama-rn', modelId: fileName };
    },
    async embedBatch(requests) {
      const vectors = await existing.embedBatch(requests);
      if (vectors.length !== requests.length) {
        throw new Error(
          `온디바이스 임베딩 응답 수 불일치: ${vectors.length}/${requests.length}`,
        );
      }
      return vectors;
    },
  };
}

/** 백그라운드 진입 시 호출 — 네이티브 컨텍스트 release. */
export async function suspendOnDeviceEmbedding(): Promise<void> {
  await activeEmbedder?.suspend();
}

const inactiveDeps: SemanticEmbedDeps = {
  async resolveEmbeddingTarget() {
    return null;
  },
  async embedBatch() {
    throw new Error('semantic rerank inactive');
  },
};

export function useMobileSemanticRerank(items: KnowledgeItem[], query: string) {
  const [enabled] = useSemanticRerankEnabled();
  const provider = useBYOKConfig((config) => config.provider);
  const apiKey = useBYOKConfig((config) => config.apiKey);
  const baseUrl = useBYOKConfig((config) => config.baseUrl);
  const model = useBYOKConfig((config) => config.model);
  const credentialsConfigured = useBYOKCredentialsConfigured();
  const onDeviceModelPath = useStore(
    onDeviceEmbeddingStore,
    (state) => state.modelPath,
  );

  // 레지스트리와 실제 파일 상태 동기화(앱 시작/복귀 시점 보정).
  useEffect(() => {
    void onDeviceEmbeddingStore.getState().refresh();
  }, []);

  const byokActive =
    enabled && credentialsConfigured && providerSupportsEmbedding(provider);
  // apiKey 스냅샷만 deps에 반영(hydrate 타이밍) — 객체 재생성으로 effect가
  // 매 렌더 재실행되지 않게 원시값을 의존 배열에 둔다.
  const byokConfig = useMemo<RerankConfigSnapshot>(
    () => ({ provider, apiKey, baseUrl, model }),
    [provider, apiKey, baseUrl, model],
  );
  const byokReadyForDeps = byokActive;

  const deps = useMemo<SemanticEmbedDeps>(() => {
    if (byokReadyForDeps) return createByokEmbedDeps(byokReadyForDeps, byokConfig);
    if (onDeviceModelPath) return createOnDeviceEmbedDeps(onDeviceModelPath);
    return inactiveDeps;
  }, [byokReadyForDeps, byokConfig, onDeviceModelPath]);

  // 백그라운드 진입 시 온디바이스 임베딩 컨텍스트 release — foreground에서
  // lazy 재초기화(embedBatch가 다시 initLlama). BYOK 경로는 네이티브
  // 리소스가 없어 영향 없음.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        void suspendOnDeviceEmbedding();
      }
    });
    return () => subscription.remove();
  }, []);

  return useSemanticRerank(items, query, deps);
}
