import { describe, expect, test } from 'bun:test';
import {
  clearLocalLLMDownloadErrorSnapshot,
  clearLocalLLMDownloadSessionSnapshot,
  createLocalLLMConfigSnapshot,
  failLocalLLMDownloadSnapshot,
  finishLocalLLMDownloadSnapshot,
  markLocalLLMDownloadCompletionHandledSnapshot,
  startLocalLLMDownloadSnapshot,
  startLocalLLMLoadingSnapshot,
  updateLocalLLMDownloadProgressSnapshot,
  updateLocalLLMLoadProgressSnapshot,
} from './local-llm';

function createConfig() {
  return {
    ...createLocalLLMConfigSnapshot({ enabled: false, selectedModelId: 'model-1' }),
    models: [
      {
        id: 'model-1',
        family: 'llama' as const,
        name: 'Model 1',
        size: 1,
        downloaded: false,
      },
    ],
    availableModels: [
      {
        id: 'model-1',
        family: 'llama' as const,
        name: 'Model 1',
        size: 1,
        downloaded: false,
      },
    ],
  };
}

describe('local llm snapshots', () => {
  test('tracks download lifecycle on both model and global state', () => {
    const started = startLocalLLMDownloadSnapshot(createConfig(), 'model-1', '/settings');
    expect(started.downloadStatus).toBe('downloading');
    expect(started.downloadingModelId).toBe('model-1');
    expect(started.downloadSourceRoute).toBe('/settings');
    expect(started.models[0]?.downloadProgress?.percentage).toBe(0);

    const progressed = updateLocalLLMDownloadProgressSnapshot(started, {
      bytesReceived: 50,
      totalBytes: 100,
      percentage: 50,
    });
    expect(progressed.downloadProgress?.percentage).toBe(50);
    expect(progressed.models[0]?.downloadProgress?.percentage).toBe(50);

    const finished = finishLocalLLMDownloadSnapshot(progressed, 'model-1', '/tmp/model.gguf');
    expect(finished.downloadStatus).toBe('completed');
    expect(finished.lastCompletedModelId).toBe('model-1');
    expect(finished.downloadingModelId).toBeNull();
    expect(finished.models[0]).toMatchObject({
      downloaded: true,
      path: '/tmp/model.gguf',
      isReady: true,
    });
  });

  test('records and clears download errors across session state', () => {
    const started = startLocalLLMDownloadSnapshot(createConfig(), 'model-1');
    const failed = failLocalLLMDownloadSnapshot(started, 'network failed');

    expect(failed.downloadStatus).toBe('error');
    expect(failed.downloadError).toBe('network failed');
    expect(failed.models[0]?.downloadError).toBe('network failed');

    const cleared = clearLocalLLMDownloadErrorSnapshot(failed);
    expect(cleared.downloadStatus).toBe('idle');
    expect(cleared.downloadError).toBeNull();
    expect(cleared.models[0]?.downloadError).toBeNull();
  });

  test('marks completion handled and clears session metadata', () => {
    const finished = finishLocalLLMDownloadSnapshot(
      startLocalLLMDownloadSnapshot(createConfig(), 'model-1', '/chat'),
      'model-1',
      '/tmp/model.gguf'
    );

    const handled = markLocalLLMDownloadCompletionHandledSnapshot(finished);
    expect(handled.downloadStatus).toBe('idle');
    expect(handled.downloadCompletionHandled).toBe(true);
    expect(handled.models[0]?.downloadCompletionHandled).toBe(true);

    const cleared = clearLocalLLMDownloadSessionSnapshot(handled);
    expect(cleared.downloadStatus).toBe('idle');
    expect(cleared.downloadingModelId).toBeNull();
    expect(cleared.lastCompletedModelId).toBeNull();
    expect(cleared.downloadSourceRoute).toBeNull();
    expect(cleared.downloadCompletionHandled).toBe(false);
    expect(cleared.models[0]?.downloadCompletionHandled).toBe(false);
    expect(cleared.models[0]?.sourceRoute).toBeNull();
  });

  test('ignores load progress when no model is selected and updates selected model otherwise', () => {
    const unselected = createLocalLLMConfigSnapshot({
      enabled: false,
      selectedModelId: null,
    });
    expect(updateLocalLLMLoadProgressSnapshot(unselected, 30)).toEqual(unselected);

    const loading = startLocalLLMLoadingSnapshot(createConfig());
    const progressed = updateLocalLLMLoadProgressSnapshot(loading, 30);
    expect(progressed.isLoading).toBe(true);
    expect(progressed.loadProgress).toEqual({ loaded: 30, total: 100, percentage: 30 });
    expect(progressed.models[0]?.loadProgress).toEqual({ loaded: 30, total: 100, percentage: 30 });
  });
});
