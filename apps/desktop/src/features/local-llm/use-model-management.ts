import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { subscribeEvent } from '@rustra/tauri';
import { useEffect, useState } from 'react';
import type { LocalModelDefinition } from '@glimpse/shared';
import {
  DOWNLOAD_DONE_EVENT,
  DOWNLOAD_FAILED_EVENT,
  DOWNLOAD_PROGRESS_EVENT,
  type ModelDownloadStatus,
} from './desktop-llm-service';
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

// 이전 modelKeys.available(['models','available']) 키는 소비처가 없어
// 무효화해도 no-op였음 — 다운로드/취소/삭제/로드/언로드 결과는 각 뮤테이션이
// llmQueryKeys.overview를 무효화해 이미 반영하므로 정의 자체를 제거했다.

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

    // rustra 0.4.0 이벤트 계약 헬퍼 — 채널명/파싱은 @rustra/tauri 담당.
    subscribeEvent<DownloadProgress>(listen, DOWNLOAD_PROGRESS_EVENT, (payload) => {
      setProgress((prev) => ({
        ...prev,
        [payload.modelId]: payload,
      }));
      setFailures((prev) => withoutKey(prev, payload.modelId));
    }).then((fn) => track(fn));

    subscribeEvent<{ modelId: string; path: string }>(listen, DOWNLOAD_DONE_EVENT, (payload) => {
      setProgress((prev) => withoutKey(prev, payload.modelId));
    }).then((fn) => track(fn));

    subscribeEvent<DownloadFailure>(listen, DOWNLOAD_FAILED_EVENT, (payload) => {
      setProgress((prev) => withoutKey(prev, payload.modelId));
      setFailures((prev) => ({
        ...prev,
        [payload.modelId]: payload,
      }));
    }).then((fn) => track(fn));

    return () => {
      disposed = true;
      unlistens.forEach((fn) => fn());
    };
  }, []);

  return { progress, failures };
}

/** Record without `key`, or the same object when the key is absent —
 * shared by the progress/done/failed handlers' immutable map updates. */
function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

/** Download a GGUF model from HuggingFace. */
export function useDownloadModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modelDef: LocalModelDefinition) => {
      return invoke<ManagedModelRecord>('download_model', { modelId: modelDef.id });
    },
    onSuccess: () => {
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
    },
  });
}
