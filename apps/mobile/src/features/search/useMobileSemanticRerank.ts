import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { useSemanticRerankEnabled } from '@/src/features/search/semantic-settings';
import { createOnDeviceEmbedder } from '@/src/features/search/on-device-embedder';
import { useStore } from 'zustand';
import { onDeviceEmbeddingStore } from '@/src/features/search/on-device-embedding-model';
import {
  useSemanticRerank,
  type SemanticEmbedDeps,
} from '@glimpse/hooks';
import type { KnowledgeItem } from '@glimpse/shared';

/**
 * Mobile wiring for the platform-neutral semantic rerank hook.
 *
 * 결정 순서: 옵트인 켜짐 + 온디바이스 nomic 임베딩 모델 다운로드 완료 →
 * llama.rn 전용 컨텍스트로 기기 내 임베딩. 아니면 null — 키워드 순서
 * pass-through. (구 BYOK /embeddings 원격 경로는 2026-09-08 완전 로컬
 * 전환으로 제거.)
 */

/**
 * 모듈 수준 임베딩 인스턴스 — 재렌더·화면 전환과 무관하게 컨텍스트를
 * 재사용하고, 백그라운드 진입 시 여기서 release한다.
 */
let activeEmbedder: ReturnType<typeof createOnDeviceEmbedder> | null = null;
let activeEmbedderPath: string | null = null;

/**
 * 온디바이스 경로 — 동일 모델 경로엔 같은 컨텍스트를 돌려주고, 경로가
 * 바뀌면(모델 교체) 기존 것을 폐기한 뒤 새로 만든다.
 *
 * 이 함수는 useMemo(=렌더 중)에서 호출된다. 기존 컨텍스트의 네이티브
 * release는 렌더 도중에 fire하지 않게 매크로태스크로 미룬다 — dispose는
 * fire-and-forget이므로 새 임베더와 겹칠 일도 없다.
 */
export function createOnDeviceEmbedDeps(modelPath: string): SemanticEmbedDeps {
  if (!activeEmbedder || activeEmbedderPath !== modelPath) {
    const stale = activeEmbedder;
    if (stale) {
      setTimeout(() => void stale.dispose(), 0);
    }
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

/** 모델 삭제 등 영구 폐기 — 컨텍스트 release + 인스턴스 참조 정리. */
export async function disposeOnDeviceEmbedding(): Promise<void> {
  const embedder = activeEmbedder;
  activeEmbedder = null;
  activeEmbedderPath = null;
  await embedder?.dispose();
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
  const onDeviceModelPath = useStore(
    onDeviceEmbeddingStore,
    (state) => state.modelPath,
  );

  // 레지스트리와 실제 파일 상태 동기화(앱 시작/복귀 시점 보정).
  useEffect(() => {
    void onDeviceEmbeddingStore.getState().refresh();
  }, []);

  const deps = useMemo<SemanticEmbedDeps>(() => {
    if (enabled && onDeviceModelPath) return createOnDeviceEmbedDeps(onDeviceModelPath);
    return inactiveDeps;
  }, [enabled, onDeviceModelPath]);

  // 백그라운드 진입 시 온디바이스 임베딩 컨텍스트 release — foreground에서
  // lazy 재초기화(embedBatch가 다시 initLlama).
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
