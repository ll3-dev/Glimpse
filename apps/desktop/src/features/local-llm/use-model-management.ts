import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { LocalModelDefinition } from '@glimpse/shared';
import { getDesktopModels } from '@glimpse/shared';
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
  path: string | null;
  size: number;
  contextLength: number;
  supportsEmbedding: boolean;
  supportsTools: boolean;
  status: string;
}

interface LoadResult {
  loadedModelId: string;
  runtimeId: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const modelKeys = {
  ...llmQueryKeys,
  available: ['models', 'available'] as const,
  registry: ['models', 'registry'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Desktop-only models from the shared LOCAL_MODEL_REGISTRY. */
export function useModelRegistry() {
  return useQuery({
    queryKey: modelKeys.registry,
    queryFn: () => getDesktopModels(),
    staleTime: Infinity, // static data
  });
}

/** Models known to the Rust backend (downloaded / ready). */
export function useInstalledModels() {
  return useQuery<ManagedModelRecord[]>({
    queryKey: modelKeys.available,
    queryFn: () => invoke<ManagedModelRecord[]>('list_managed_models'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
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
