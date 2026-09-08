/**
 * 커스텀 GGUF 다운로드 — GGUF 탐색기에서 고른 카탈로그 외 모델을
 * 기존 다운로드 파이프라인(진행 배너·취소·sha256 검증)으로 받는다.
 *
 * 다운로드 자체는 ModelDownloader를 재사용하고, 완료된 모델은
 * availableModels에 커스텀 항목으로 등록돼 채팅·라벨링 타깃이 된다.
 */

import type { ModelInfo } from "@/src/features/ai/model-manager";
import { ModelDownloader, modelDownloader } from "@/src/features/ai/model-manager";
import { customModelId, type GGUFFileEntry } from "@/src/features/ai/model-manager/huggingface-search";
import {
  clearLocalLLMDownloadError,
  clearLocalLLMDownloadSession,
  failLocalLLMDownload,
  finishLocalLLMDownload,
  getLocalLLMStoreConfig,
  startLocalLLMDownload,
  updateLocalLLMDownloadProgress,
  updateLocalLLMModel,
  addLocalLLMModel,
  type DownloadProgress,
} from "@/src/stores/settings/local-llm.store";
import { enableLocalLLM, selectModel } from "./local-llm.commands";

type DownloadCustomGGUFResult =
  | { success: true; path: string }
  | { success: false; cancelled: true }
  | { success: false; error: string };

function convertProgress(progress: {
  written: number;
  total: number;
  percentage: number;
}): DownloadProgress {
  return {
    bytesReceived: progress.written,
    totalBytes: progress.total,
    percentage: progress.percentage,
  };
}

/**
 * 커스텀 GGUF 다운로드. 파일 크기를 모르는 경우 sizeBytes를 생략해도
 * 된다 — ModelDownloader가 HF API에서 공식 크기·sha256을 조회해 검증한다.
 */
export async function downloadCustomGGUF(
  repoId: string,
  file: Pick<GGUFFileEntry, "filename" | "sizeBytes">,
): Promise<DownloadCustomGGUFResult> {
  const config = getLocalLLMStoreConfig();
  if (config.downloadStatus === "downloading") {
    return { success: false, error: "다른 모델 다운로드가 진행 중입니다." };
  }

  const id = customModelId(repoId, file.filename);
  const name = file.filename.replace(/\.gguf$/i, "");

  // 카탈로그 외 모델 — embedded-chat 범용 프리셋으로 등록한다.
  addLocalLLMModel({
    id,
    name,
    family: "embedded-chat",
    size: file.sizeBytes,
    downloaded: false,
    path: null,
    isReady: false,
  });

  clearLocalLLMDownloadError();
  startLocalLLMDownload(id, null);

  try {
    // ModelDownloader는 repo/filename/id/sizeBytes만 사용한다 — 나머지
    // 카탈로그 전용 필드는 HF API 조회값(공식 크기·sha256)으로 대체된다.
    const modelDef = {
      id,
      name,
      repo: repoId,
      filename: file.filename,
      sizeBytes: file.sizeBytes,
    } as unknown as ModelInfo;

    const path = await modelDownloader.downloadModel(modelDef, (progress) => {
      updateLocalLLMDownloadProgress(convertProgress(progress));
    });

    finishLocalLLMDownload(id, path);

    const size = await ModelDownloader.getModelSize(file.filename);
    updateLocalLLMModel(id, {
      size: size ?? file.sizeBytes,
      repo: repoId,
      filename: file.filename,
    });

    selectModel(id);
    enableLocalLLM();

    return { success: true, path };
  } catch (error) {
    const message = error instanceof Error ? error.message : "다운로드 실패";
    if (message === "다운로드가 취소되었습니다.") {
      clearLocalLLMDownloadSession();
      return { success: false, cancelled: true };
    }

    failLocalLLMDownload(message);
    return { success: false, error: message };
  }
}
