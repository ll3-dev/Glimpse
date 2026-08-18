import { describe, expect, test, mock, beforeEach } from 'bun:test';
import {
  resetLocalLLMStoreConfig,
  addLocalLLMModel,
  getLocalLLMStoreConfig,
} from '@/src/stores/settings/local-llm.store';

/**
 * 다운로드 시작/취소가 동일 모델다운로더 인스턴스를 거치는지 검증.
 *
 * 과거 버그: downloadLocalModel이 new ModelDownloader()로 시작하고
 * cancelLocalModelDownload가 싱글턴을 사용해, 인스턴스 상태가 달라
 * 취소가 실제 fetch에 도달하지 않았다.
 *
 * 스토어는 순수 zustand 구현이라 실제 모듈을 그대로 사용하고,
 * RNBlobUtil에 묶인 다운로더 싱글턴만 스텁으로 교체한다
 * (mock.module은 프로세스 전역으로 새어나가므로 실제 모듈을
 * 펼쳐 다른 export가 사라지지 않게 유지한다).
 */

const cancelDownloadMock = mock(async (_filename: string) => {});
const downloadModelMock = mock(
  async (
    _model: { id: string; filename: string },
    _onProgress?: (p: unknown) => void,
  ) => '/downloaded/model.gguf',
);

const realModelManager = await import('@/src/features/ai/model-manager');
const RealModelDownloader = realModelManager.ModelDownloader;

mock.module('@/src/features/ai/model-manager', () => ({
  ...realModelManager,
  ModelDownloader: class extends RealModelDownloader {},
  modelDownloader: {
    downloadModel: downloadModelMock,
    cancelDownload: cancelDownloadMock,
  },
}));

const { downloadLocalModel, cancelLocalModelDownload } = await import('./local-llm.download');

const TEST_MODEL = {
  id: 'm1',
  name: 'Test Model',
  filename: 'model.gguf',
  repo: 'test/repo',
  family: 'qwen-chatml',
  isReady: false,
} as const;

describe('download/cancel downloader 인스턴스 일치', () => {
  beforeEach(() => {
    cancelDownloadMock.mockClear();
    downloadModelMock.mockClear();
    resetLocalLLMStoreConfig();
    addLocalLLMModel({ ...TEST_MODEL });
  });

  test('진행 중 취소하면 싱글턴의 cancelDownload가 호출된다', async () => {
    const downloadPromise = downloadLocalModel({ ...TEST_MODEL });
    // startLocalLLMDownload이 스토어를 downloading으로 만든 뒤 취소
    expect(getLocalLLMStoreConfig().downloadingModelId).toBe(TEST_MODEL.id);

    await cancelLocalModelDownload();

    expect(cancelDownloadMock).toHaveBeenCalledTimes(1);
    expect(cancelDownloadMock.mock.calls[0][0]).toBe('model.gguf');

    await downloadPromise;
  });

  test('다운로드 성공 시 스토어가 completed로 수렴한다', async () => {
    const result = await downloadLocalModel({ ...TEST_MODEL });

    expect(result.success).toBe(true);
    const config = getLocalLLMStoreConfig();
    expect(config.downloadStatus).toBe('completed');
    expect(config.downloadingModelId).toBeNull();
  });

  test('다른 모델 다운로드 중이면 거부한다', async () => {
    const { startLocalLLMDownload } = await import('@/src/stores/settings/local-llm.store');
    startLocalLLMDownload('other-model');

    const result = await downloadLocalModel({ ...TEST_MODEL });
    expect(result.success).toBe(false);
  });
});
