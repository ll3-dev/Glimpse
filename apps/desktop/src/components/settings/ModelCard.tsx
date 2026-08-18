import { useState } from 'react';
import type { LocalModelDefinition, LocalLLMModelFamily, ModelCapability } from '@glimpse/shared';
import type { ManagedModelRecord } from '@/features/local-llm/desktop-llm-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  Trash2,
  Loader2,
  Check,
  X,
  HardDrive,
  Zap,
  Eye,
  Brain,
  Code,
  Search,
  MessageSquare,
} from 'lucide-react';

export interface ModelCardProps {
  model: LocalModelDefinition;
  installedModel?: ManagedModelRecord;
  isActive: boolean;
  onDownload: (model: LocalModelDefinition) => void;
  onLoad: (modelId: string) => void;
  onUnload: (modelId: string) => void;
  onDelete?: (modelId: string) => void;
  isDownloading?: boolean;
  downloadProgress?: number;
  /** 다운로드 실패 사유 — 실패 이벤트 수신 시 표시 */
  downloadError?: string;
}

// ── Family badge colors ──────────────────────────────────────────────────────

const FAMILY_COLORS: Record<string, string> = {
  'qwen-chatml': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  qwen: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  llama: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  phi: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  gemma: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  glm: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  nomic: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300',
  'generic-instruct': 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300',
  mistral: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

function getFamilyColor(family: LocalLLMModelFamily): string {
  return FAMILY_COLORS[family] ?? FAMILY_COLORS['generic-instruct']!;
}

// ── Capability config ────────────────────────────────────────────────────────

const CAPABILITY_CONFIG: Record<ModelCapability, { label: string; icon: React.ElementType }> = {
  chat: { label: 'Chat', icon: MessageSquare },
  code: { label: 'Code', icon: Code },
  reasoning: { label: 'Reasoning', icon: Brain },
  embedding: { label: 'Embedding', icon: Search },
  vision: { label: 'Vision', icon: Eye },
  tools: { label: 'Tools', icon: Zap },
};

// ── Helper ───────────────────────────────────────────────────────────────────

function formatContextLength(ctx: number): string {
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(0)}M`;
  if (ctx >= 1_000) return `${(ctx / 1_000).toFixed(0)}K`;
  return String(ctx);
}

// ── Component ────────────────────────────────────────────────────────────────

export function ModelCard({
  model,
  installedModel,
  isActive,
  onDownload,
  onLoad,
  onUnload,
  onDelete,
  isDownloading,
  downloadProgress = 0,
  downloadError,
}: ModelCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isInstalled = installedModel?.status === 'ready' || installedModel?.status === 'active';

  return (
    <div
      className={`group relative rounded-lg border bg-card p-4 transition-all hover:shadow-sm ${
        isActive
          ? 'border-primary ring-1 ring-primary/30'
          : 'border-border'
      }`}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute -top-px -right-px -bottom-px -left-px rounded-lg border-2 border-primary pointer-events-none" />
      )}

      {/* Header row: name + family badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-card-foreground truncate">
            {model.name}
          </h4>
          {model.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {model.description}
            </p>
          )}
        </div>
        <Badge
          className={`shrink-0 text-[10px] px-1.5 py-0 h-5 border-0 ${getFamilyColor(model.family)}`}
        >
          {model.family}
        </Badge>
      </div>

      {/* Meta row: size + quantization + context */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          {model.displaySize}
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {model.quantization}
        </span>
        <span>
          ctx {formatContextLength(model.contextLength)}
        </span>
      </div>

      {/* Capability badges */}
      <div className="flex flex-wrap gap-1 mb-3">
        {model.capabilities.map((cap) => {
          const config = CAPABILITY_CONFIG[cap];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <Badge
              key={cap}
              variant="secondary"
              className="h-5 gap-0.5 text-[10px] px-1.5"
            >
              <Icon className="h-2.5 w-2.5" />
              {config.label}
            </Badge>
          );
        })}
      </div>

      {/* Status + download progress */}
      {isDownloading && (
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">다운로드 중...</span>
            <span className="font-medium text-primary">{downloadProgress}%</span>
          </div>
          <Progress value={downloadProgress} />
        </div>
      )}

      {/* Download failure */}
      {downloadError && !isDownloading && (
        <div className="mb-3 rounded-md bg-destructive/10 px-2.5 py-1.5">
          <p className="text-xs text-destructive truncate" title={downloadError}>
            다운로드 실패: {downloadError}
          </p>
        </div>
      )}

      {/* Status line */}
      {!isDownloading && (
        <div className="flex items-center gap-1.5 mb-3">
          {isActive ? (
            <>
              <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                활성 (Active)
              </span>
            </>
          ) : isInstalled ? (
            <>
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-xs text-muted-foreground">설치됨</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0" />
              <span className="text-xs text-muted-foreground">미설치</span>
            </>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {!isInstalled && !isDownloading && (
          <Button
            size="sm"
            onClick={() => onDownload(model)}
            className="gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            다운로드
          </Button>
        )}

        {isDownloading && (
          <Button size="sm" disabled className="gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            다운로드 중...
          </Button>
        )}

        {isInstalled && !isActive && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onLoad(model.id)}
            className="gap-1"
          >
            <Zap className="h-3.5 w-3.5" />
            로드
          </Button>
        )}

        {isActive && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onUnload(model.id)}
            className="gap-1"
          >
            <X className="h-3.5 w-3.5" />
            언로드
          </Button>
        )}

        {isInstalled && onDelete && !confirmDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            className="gap-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}

        {isInstalled && onDelete && confirmDelete && (
          <div className="flex items-center gap-1.5">
            <Button
              size="xs"
              variant="destructive"
              onClick={() => {
                onDelete(model.id);
                setConfirmDelete(false);
              }}
              className="gap-1"
            >
              <Check className="h-3 w-3" />
              확인
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
            >
              취소
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
