import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import type { LocalModelDefinition } from '@glimpse/shared';
import type { ModelDownloadStatus } from './desktop-llm-service';
import { llmQueryKeys } from './use-desktop-llm-overview';

// ---------------------------------------------------------------------------
// Tauri command response types (mirrors src-tauri/src/models.rs)
// ---------------------------------------------------------------------------
export interface ManagedModelRecord {
  id: string;
  name: string;
  family: string;
  quantization: string;
  format: string;
  repo: string;
  filename: string;
  path: string | null;
  size: number;
  contextLength: number;
  supportsEmbedding: boolean;
  supportsTools: boolean;
  status: ModelDownloadStatus;
}

interface LoadResult {
  loadedModelId: string;
  runtimeId: string;
}

export interface DownloadProgress {
  modelId: string;
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
}

export interface DownloadFailure {
  modelId: string;
  error: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const modelKeys = {
  ...llmQueryKeys,
  available: ['models', 'available'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Track download progress for all active downloads.
 *
 * 완료/실패 이벤트에서 해당 모델의 진행 항목을 제거해 진행바가
 * 마지막 퍼센트에 갇히지 않게 한다. 실패는 별도 맵으로 노출한다.
 */
export function useDownloadProgress() {
  const [progress, setProgress] = useState<Record<string, DownloadProgress>>({});
  const [failures, setFailures] = useState<Record<string, DownloadFailure>>({});

  useEffect(() => {
    // listen 프라미스가 클린업보다 늦게 resolve되면 unlisten이 null인
    // 채로 유출된다 — disposed 플래그로 즉시 해제한다.
    let disposed = false;
    const unlistens: Array<() => void> = [];

    const track = (fn: () => void) => {
      if (disposed) fn();
      else unlistens.push(fn);
    };

    listen<DownloadProgress>('rustra://model:download-progress', (event) => {
      setProgress((prev) => ({
        ...prev,
        [event.payload.modelId]: event.payload,
      }));
      setFailures((prev) => {
        if (!(event.payload.modelId in prev)) return prev;
        const next = { ...prev };
        delete next[event.payload.modelId];
        return next;
      });
    }).then((fn) => track(fn));

    listen<{ modelId: string; path: string }>('rustra://model:download-done', (event) => {
      setProgress((prev) => {
        if (!(event.payload.modelId in prev)) return prev;
        const next = { ...prev };
        delete next[event.payload.modelId];
        return next;
      });
    }).then((fn) => track(fn));

    listen<DownloadFailure>('rustra://model:download-failed', (event) => {
      setProgress((prev) => {
        if (!(event.payload.modelId in prev)) return prev;
        const next = { ...prev };
        delete next[event.payload.modelId];
        return next;
      });
      setFailures((prev) => ({
        ...prev,
        [event.payload.modelId]: event.payload,
      }));
    }).then((fn) => track(fn));

    return () => {
      disposed = true;
      unlistens.forEach((fn) => fn());
    };
  }, []);

  return { progress, failures };
}

/** Download a GGUF model from HuggingFace. */
export function useDownloadModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modelDef: LocalModelDefinition) => {
      return invoke<ManagedModelRecord>('download_model', { modelId: modelDef.id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modelKeys.available });
      void queryClient.invalidateQueries({ queryKey: llmQueryKeys.overview });
    },
  });
}

/** Request cancellation of an in-flight download (flag-based, observed between chunks). */
export function useCancelDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modelId: string) => {
      return invoke<void>('cancel_download', { modelId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modelKeys.available });
      void queryClient.invalidateQueries({ queryKey: llmQueryKeys.overview });
    },
  });
}

/** Delete a downloaded model file from disk. */
export function useDeleteModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modelId: string) => {
      return invoke<void>('delete_model', { modelId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modelKeys.available });
      void queryClient.invalidateQueries({ queryKey: llmQueryKeys.overview });
    },
  });
}

/** Load a downloaded model into memory for inference. */
export function useLoadModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ modelId, runtimeId }: { modelId: string; runtimeId: string }) => {
      return invoke<LoadResult>('load_model', { modelId, runtimeId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: llmQueryKeys.overview });
      void queryClient.invalidateQueries({ queryKey: modelKeys.available });
    },
  });
}

/** Unload a model from memory. */
export function useUnloadModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modelId: string) => {
      return invoke<void>('unload_model', { modelId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: llmQueryKeys.overview });
      void queryClient.invalidateQueries({ queryKey: modelKeys.available });
    },
  });
}
