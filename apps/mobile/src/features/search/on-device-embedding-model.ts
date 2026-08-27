import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { storage, StorageKeys } from '@/src/lib/storage';
import {
  ModelDownloader,
  modelDownloader,
  getPreferredEmbeddingModel,
  type ModelInfo,
} from '@/src/features/ai/model-manager';
import { disposeOnDeviceEmbedding } from './useMobileSemanticRerank';

/**
 * On-device embedding model state — 검색 재정렬 폴백용 nomic 모델.
 *
 * 채팅 Local LLM 카탈로그와 분리된 단일 슬롯: 다운로드는 기존
 * modelDownloader를 재사용하되 local-llm.store(채팅 선택/활성화)를
 * 오염시키지 않는다. 준비 완료 시 {modelId, modelPath}만 유지한다.
 */

export interface OnDeviceEmbeddingModelInfo {
  id: string;
  name: string;
  displaySize?: string;
  sizeBytes?: number;
}

interface OnDeviceEmbeddingState {
  /** 카탈로그에 노출할 모델 메타데이터(레지스트리 preferred) */
  modelInfo: OnDeviceEmbeddingModelInfo | null;
  /** 다운로드 완료 후 절대 경로 — null이면 미준비 */
  modelPath: string | null;
  downloading: boolean;
  progressPercentage: number | null;
  error: string | null;
  refresh: () => Promise<void>;
  download: () => Promise<void>;
  remove: () => Promise<void>;
  setDownloadingProgress: (percentage: number) => void;
  setDownloadError: (message: string | null) => void;
}

const registryModel = getPreferredEmbeddingModel();

function toModelInfo(def: ModelInfo | undefined): OnDeviceEmbeddingModelInfo | null {
  if (!def) return null;
  return {
    id: def.id,
    name: def.name,
    displaySize: def.size,
    sizeBytes: def.sizeBytes,
  };
}

async function resolveModelPath(): Promise<string | null> {
  if (!registryModel) return null;
  const downloaded = await ModelDownloader.isModelDownloaded(
    registryModel.filename,
    registryModel.sizeBytes,
  ).catch(() => false);
  if (!downloaded) return null;
  return ModelDownloader.getModelPath(registryModel.filename);
}

export const onDeviceEmbeddingStore = createStore<OnDeviceEmbeddingState>(
  (set) => ({
    modelInfo: toModelInfo(registryModel),
    modelPath: null,
    downloading: false,
    progressPercentage: null,
    error: null,

    async refresh() {
      const path = await resolveModelPath();
      set({ modelPath: path });
    },

    async download() {
      if (!registryModel) return;
      set({ downloading: true, progressPercentage: 0, error: null });
      try {
        // 채팅 다운로드 파이프라인(downloadLocalModel)은 채팅 store를
        // 오염시키므로 저수준 downloader를 직접 사용한다.
        await modelDownloader.downloadModel(registryModel, (progress) => {
          set({ progressPercentage: progress.percentage });
        });
        storage.set(StorageKeys.ON_DEVICE_EMBEDDING_MODEL_ID, registryModel.id);
        const path = ModelDownloader.getModelPath(registryModel.filename);
        set({ downloading: false, progressPercentage: null, modelPath: path });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '임베딩 모델 다운로드 실패';
        set({ downloading: false, progressPercentage: null, error: message });
      }
    },

    async remove() {
      if (!registryModel) return;
      try {
        await ModelDownloader.deleteModel(registryModel.filename);
      } finally {
        // 살아있는 임베딩 컨텍스트(수백 MB 네이티브)를 즉시 반납 — 모델
        // 파일만 지우면 컨텍스트는 다음 background까지 메모리에 잔류한다.
        await disposeOnDeviceEmbedding();
        storage.remove(StorageKeys.ON_DEVICE_EMBEDDING_MODEL_ID);
        set({ modelPath: null, error: null });
      }
    },

    setDownloadingProgress(percentage) {
      set({ progressPercentage: percentage });
    },

    setDownloadError(message) {
      set({ error: message, downloading: false, progressPercentage: null });
    },
  }),
);

/** 설정 UI용 구독 훅. */
export function useOnDeviceEmbedding() {
  return useStore(onDeviceEmbeddingStore);
}
