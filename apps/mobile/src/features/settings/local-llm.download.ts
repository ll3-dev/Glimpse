import type { ModelInfo, DownloadProgress as ModelDownloaderProgress } from '@/src/features/ai/model-manager';
import { ModelDownloader, modelDownloader } from '@/src/features/ai/model-manager';
// 주의: downloadLocalModel과 cancelLocalModelDownload는 반드시 같은
// 인스턴스(modelDownloader 싱글턴)를 사용해야 한다 — 인스턴스별
// activeTask/activeFilename 상태가 다르면 취소가 실제 fetch에
// 도달하지 않는다.
import {
  clearLocalLLMDownloadSession,
  clearLocalLLMDownloadError,
  finishLocalLLMDownload,
  getLocalLLMStoreConfig,
  startLocalLLMDownload,
  failLocalLLMDownload,
  updateLocalLLMDownloadProgress,
  updateLocalLLMModel,
  type DownloadProgress,
} from '@/src/stores/settings/local-llm.store';
import { enableLocalLLM, selectModel } from './local-llm.commands';

type DownloadLocalModelResult =
  | { success: true; path: string }
  | { success: false; cancelled: true }
  | { success: false; error: string };

type DownloadLocalModelOptions = {
  sourceRoute?: string | null;
};

function convertProgress(progress: ModelDownloaderProgress): DownloadProgress {
  return {
    bytesReceived: progress.written,
    totalBytes: progress.total,
    percentage: progress.percentage,
  };
}

export async function downloadLocalModel(
  model: ModelInfo,
  options: DownloadLocalModelOptions = {}
): Promise<DownloadLocalModelResult> {
  const config = getLocalLLMStoreConfig();
  if (config.downloadStatus === 'downloading') {
    return {
      success: false,
      error:
        config.downloadingModelId === model.id
          ? '이미 다운로드 중입니다.'
          : '다른 모델 다운로드가 진행 중입니다.',
    };
  }

  clearLocalLLMDownloadError();
  startLocalLLMDownload(model.id, options.sourceRoute ?? null);

  try {
    const path = await modelDownloader.downloadModel(model, (progress) => {
      updateLocalLLMDownloadProgress(convertProgress(progress));
    });

    finishLocalLLMDownload(model.id, path);

    const size = await ModelDownloader.getModelSize(model.filename);
    updateLocalLLMModel(model.id, {
      family: model.family,
      size: size ?? undefined,
      repo: model.repo,
      filename: model.filename,
    });

    selectModel(model.id);
    enableLocalLLM();

    return { success: true, path };
  } catch (error) {
    const message = error instanceof Error ? error.message : '다운로드 실패';
    if (message === '다운로드가 취소되었습니다.') {
      clearLocalLLMDownloadSession();
      return { success: false, cancelled: true };
    }

    failLocalLLMDownload(message);
    return { success: false, error: message };
  }
}

export async function cancelLocalModelDownload(): Promise<void> {
  const config = getLocalLLMStoreConfig();
  const downloadingModel = config.availableModels.find(
    (model) => model.id === config.downloadingModelId
  );

  if (!config.downloadingModelId || !downloadingModel?.filename) {
    clearLocalLLMDownloadSession();
    return;
  }

  try {
    await modelDownloader.cancelDownload(downloadingModel.filename);
  } finally {
    clearLocalLLMDownloadSession();
  }
}
