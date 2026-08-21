import {
  ModelDownloader,
  getModelById,
  modelDownloader,
} from "@/src/features/ai/model-manager";
import {
  clearLocalLLMDownloadSession,
  finishLocalLLMDownload,
  getLocalLLMStoreConfig,
  startLocalLLMDownload,
  updateLocalLLMDownloadProgress,
  updateLocalLLMModel,
} from "@/src/stores/settings/local-llm.store";
import { enableLocalLLM, selectModel } from "./local-llm.commands";
import { syncRecommendedLocalModels } from "./local-llm.sync";
import {
  clearPersistedModelDownloadSession,
  getPersistedModelDownloadSession,
} from "./local-model-download-session";

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export type LocalModelDownloadRecovery =
  | "idle"
  | "active"
  | "pending"
  | "completed";

export async function recoverLocalModelDownload(): Promise<LocalModelDownloadRecovery> {
  const session = getPersistedModelDownloadSession();
  if (!session) return "idle";

  if (modelDownloader.isDownloadActive(session.filename)) {
    return "active";
  }

  const model = getModelById(session.modelId);
  if (!model || model.filename !== session.filename) {
    clearPersistedModelDownloadSession();
    clearLocalLLMDownloadSession();
    return "idle";
  }

  let config = getLocalLLMStoreConfig();
  if (!config.availableModels.some((item) => item.id === model.id)) {
    await syncRecommendedLocalModels();
    config = getLocalLLMStoreConfig();
  }

  const recovered = await ModelDownloader.recoverDownload(model);

  if (recovered.status === "completed") {
    if (config.downloadingModelId !== model.id) {
      startLocalLLMDownload(model.id, session.sourceRoute);
    }
    finishLocalLLMDownload(model.id, recovered.path);
    updateLocalLLMModel(model.id, {
      family: model.family,
      repo: model.repo,
      filename: model.filename,
      size: model.sizeBytes ?? 0,
    });
    selectModel(model.id);
    enableLocalLLM();
    clearPersistedModelDownloadSession();
    return "completed";
  }

  if (
    recovered.status === "missing" &&
    Date.now() - session.startedAt > SESSION_EXPIRY_MS
  ) {
    clearPersistedModelDownloadSession();
    clearLocalLLMDownloadSession();
    return "idle";
  }

  if (config.downloadingModelId !== model.id) {
    startLocalLLMDownload(model.id, session.sourceRoute);
  }

  const written = recovered.status === "pending" ? recovered.written : 0;
  const total = recovered.status === "pending" ? recovered.total : model.sizeBytes ?? 0;
  updateLocalLLMDownloadProgress({
    bytesReceived: written,
    totalBytes: total,
    percentage: total > 0 ? Math.min(99, Math.round((written / total) * 100)) : 0,
  });
  return "pending";
}
