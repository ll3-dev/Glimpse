import { useMemo } from 'react';
import { getDesktopModels, type LocalModelDefinition } from '@glimpse/shared';
import type { ManagedModelRecord } from '@/features/local-llm/desktop-llm-service';
import { useDesktopLLMOverview, useInvalidateLLMOverview } from '@/features/local-llm/use-desktop-llm-overview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Cpu, Download, Loader2, RefreshCw } from 'lucide-react';
import { ModelCard } from './ModelCard';

// ── Categories ───────────────────────────────────────────────────────────────

interface ModelCategory {
  id: string;
  label: string;
  filter: (m: LocalModelDefinition) => boolean;
  recommended?: boolean;
}

const CATEGORIES: ModelCategory[] = [
  {
    id: 'recommended',
    label: '추천 (Recommended)',
    filter: (m) => {
      // Curated recommendation set: best quality/speed ratio for general use
      const recommendedIds = new Set([
        'qwen3.5-35b-a3b-q4',   // MoE: best quality at low cost
        'qwen3.5-9b-q4',        // High performance medium model
        'qwen3.5-2b-q4',        // Fast & balanced
        'ministral-3-8b-instruct-q4', // Tools & agent instruct
      ]);
      return recommendedIds.has(m.id);
    },
    recommended: true,
  },
  {
    id: 'chat',
    label: '채팅 (Chat)',
    filter: (m) =>
      m.capabilities.includes('chat') &&
      !m.capabilities.includes('embedding'),
  },
  {
    id: 'code',
    label: '코딩 (Code)',
    filter: (m) => m.capabilities.includes('code'),
  },
  {
    id: 'reasoning',
    label: '추론 (Reasoning)',
    filter: (m) => m.capabilities.includes('reasoning'),
  },
  {
    id: 'embedding',
    label: '임베딩 (Embedding)',
    filter: (m) => m.capabilities.includes('embedding'),
  },
];

import {
  useDownloadModel,
  useDownloadProgress,
  useLoadModel,
  useUnloadModel,
  useDeleteModel,
} from '@/features/local-llm/use-model-management';

interface ModelManagerSectionProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function ModelManagerSection({
  enabled,
  onToggle,
}: ModelManagerSectionProps) {
  const { data: overview, isLoading } = useDesktopLLMOverview();
  const invalidateOverview = useInvalidateLLMOverview();
  const { progress: downloadProgressMap, failures: downloadFailures } = useDownloadProgress();

  const downloadMutation = useDownloadModel();
  const loadMutation = useLoadModel();
  const unloadMutation = useUnloadModel();
  const deleteMutation = useDeleteModel();

  const desktopModels = useMemo(() => getDesktopModels(), []);

  // Build a map of installed models for quick lookup
  const installedMap = useMemo(() => {
    const map = new Map<string, ManagedModelRecord>();
    if (overview?.models) {
      for (const m of overview.models) {
        map.set(m.id, m);
      }
    }
    return map;
  }, [overview?.models]);

  // Currently loaded model id from health
  const activeModelId = overview?.health?.loadedModelId ?? null;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDownload = (model: LocalModelDefinition) => {
    downloadMutation.mutate(model);
  };

  const handleLoad = (modelId: string) => {
    loadMutation.mutate({ modelId, runtimeId: 'managed-local' });
  };

  const handleUnload = (modelId: string) => {
    unloadMutation.mutate(modelId);
  };

  const handleDelete = (modelId: string) => {
    deleteMutation.mutate(modelId);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold text-card-foreground">
            Local LLM
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="local-llm-toggle" className="text-sm text-muted-foreground cursor-pointer">
            {enabled ? '켜짐' : '꺼짐'}
          </Label>
          <Switch
            id="local-llm-toggle"
            checked={enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </div>

      {/* Runtime status & scan refresh */}
      {enabled && (
        <div className="flex items-center justify-between gap-2 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                overview?.health?.status === 'healthy'
                  ? 'bg-green-500'
                  : overview?.health?.status === 'degraded'
                    ? 'bg-yellow-500'
                    : 'bg-muted-foreground/40'
              }`}
            />
            <span className="text-muted-foreground">
              {isLoading
                ? '상태 확인 중...'
                : overview?.health?.status === 'healthy'
                  ? '런타임 정상'
                  : overview?.health?.status === 'degraded'
                    ? '런타임 일부 제한'
                    : '런타임 상태 불명'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => invalidateOverview()}
              className="h-7 text-xs gap-1.5 px-2.5"
              title="LM Studio, oMLX, HuggingFace 등 로컬 모델 폴더 재스캔"
            >
              <RefreshCw className="h-3 w-3" />
              로컬 / LM Studio 스캔
            </Button>
            {activeModelId && (
              <Badge variant="secondary" className="gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {installedMap.get(activeModelId)?.name ?? activeModelId}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Disabled state */}
      {!enabled && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          로컬 LLM을 활성화하면 모델 관리 화면이 나타납니다. llama.cpp 기반으로
          기기에서 직접 추론을 실행합니다.
        </p>
      )}

      {/* Model grid (only when enabled) */}
      {enabled && (
        <Tabs defaultValue="recommended">
          <TabsList variant="line" className="mb-4 w-full justify-start overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-1">
                {cat.label}
                {cat.recommended && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                    추천
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {isLoading && (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-lg" />
              ))}
            </div>
          )}

          {!isLoading &&
            CATEGORIES.map((cat) => {
              const filtered = desktopModels.filter(cat.filter);
              if (filtered.length === 0) return null;

              return (
                <TabsContent key={cat.id} value={cat.id}>
                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                    {filtered.map((model) => {
                      const installed = installedMap.get(model.id);
                      const dlState = downloadProgressMap[model.id];
                      const dlFailure = downloadFailures[model.id];
                      const isActive = activeModelId === model.id;

                      return (
                        <ModelCard
                          key={model.id}
                          model={model}
                          installedModel={installed}
                          isActive={isActive}
                          onDownload={handleDownload}
                          onLoad={handleLoad}
                          onUnload={handleUnload}
                          onDelete={handleDelete}
                          isDownloading={dlState != null}
                          downloadProgress={dlState ? Math.round(dlState.percentage) : undefined}
                          downloadError={dlFailure?.error}
                        />
                      );
                    })}
                  </div>
                </TabsContent>
              );
            })}
        </Tabs>
      )}
    </div>
  );
}
