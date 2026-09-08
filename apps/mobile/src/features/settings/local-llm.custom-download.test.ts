import { describe, expect, test, mock, beforeEach } from "bun:test";
import {
  resetLocalLLMStoreConfig,
  getLocalLLMStoreConfig,
} from "@/src/stores/settings/local-llm.store";

/**
 * 커스텀 GGUF 다운로드 — 카탈로그 외 모델이 기존 다운로드 파이프라인을
 * 그대로 타는지(진행 상태·완료 후 선택·로컬 AI 활성화) 검증한다.
 * 다운로더 싱글턴만 스텁으로 교체하고 스토어는 실제 모듈을 쓴다
 * (local-llm.download.test.ts와 같은 패턴).
 */

const downloadModelMock = mock(
  async (
    _model: { id: string; filename: string },
    _onProgress?: (p: unknown) => void,
  ) => "/downloaded/custom.gguf",
);

const realModelManager = await import("@/src/features/ai/model-manager");
const RealModelDownloader = realModelManager.ModelDownloader;

mock.module("@/src/features/ai/model-manager", () => ({
  ...realModelManager,
  ModelDownloader: class extends RealModelDownloader {},
  modelDownloader: {
    downloadModel: downloadModelMock,
    cancelDownload: mock(async (_filename: string) => {}),
  },
}));

const { downloadCustomGGUF } = await import("./local-llm.custom-download");
const { customModelId } = await import(
  "@/src/features/ai/model-manager/huggingface-search"
);

const REPO = "unsloth/gemma-3n-E4B-it-GGUF";
const FILE = { filename: "gemma-3n-E4B-it-Q4_K_M.gguf", sizeBytes: 4_539_054_208 };

describe("downloadCustomGGUF", () => {
  beforeEach(() => {
    downloadModelMock.mockClear();
    resetLocalLLMStoreConfig();
  });

  test("커스텀 모델로 등록되고 완료 시 선택·활성화된다", async () => {
    const result = await downloadCustomGGUF(REPO, { ...FILE });

    expect(result.success).toBe(true);
    const config = getLocalLLMStoreConfig();
    expect(config.downloadStatus).toBe("completed");

    const id = customModelId(REPO, FILE.filename);
    const custom = config.availableModels.find((model) => model.id === id);
    expect(custom).toBeDefined();
    expect(custom?.isReady).toBe(true);
    expect(custom?.filename).toBe(FILE.filename);
    expect(custom?.repo).toBe(REPO);
    expect(config.selectedModelId).toBe(id);
    expect(config.enabled).toBe(true);
  });

  test("다른 다운로드 진행 중이면 거부한다", async () => {
    const { startLocalLLMDownload } = await import(
      "@/src/stores/settings/local-llm.store"
    );
    startLocalLLMDownload("other-model");

    const result = await downloadCustomGGUF(REPO, { ...FILE });
    expect(result.success).toBe(false);
    expect(downloadModelMock).not.toHaveBeenCalled();
  });

  test("다운로드 실패는 실패 상태를 남긴다", async () => {
    downloadModelMock.mockImplementationOnce(async () => {
      throw new Error("network boom");
    });

    const result = await downloadCustomGGUF(REPO, { ...FILE });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("network boom");
    }
    const config = getLocalLLMStoreConfig();
    expect(config.downloadStatus).toBe("error");
  });
});
