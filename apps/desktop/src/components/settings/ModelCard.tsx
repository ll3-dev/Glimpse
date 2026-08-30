import { useState } from 'react';
import type { LocalModelDefinition, LocalLLMModelFamily, ModelCapability } from '@glimpse/shared';
import type { ManagedModelRecord } from '@/features/local-llm/desktop-llm-service';
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
  /** 진행 중 다운로드 취소 요청 */
  onCancelDownload?: (modelId: string) => void;
  isDownloading?: boolean;
  downloadProgress?: number;
  /** 다운로드 실패 사유 — 실패 이벤트 수신 시 표시 */
  downloadError?: string;
  /** 모델 로드 진행 중 — 수십 초 걸리는 로드에 피드백 제공 */
  isLoading?: boolean;
}

// ── Family badge colors (Semantic Pastel Tokens) ─────────────────────────────

const FAMILY_COLORS: Record<string, string> = {
  'qwen-chatml': 'bg-tag-sky-bg text-tag-sky-text',
  qwen: 'bg-tag-sky-bg text-tag-sky-text',
  llama: 'bg-tag-lavender-bg text-tag-lavender-text',
  phi: 'bg-tag-mint-bg text-tag-mint-text',
  gemma: 'bg-tag-peach-bg text-tag-peach-text',
  glm: 'bg-tag-mint-bg text-tag-mint-text',
  nomic: 'bg-tag-neutral-bg text-tag-neutral-text',
  'generic-instruct': 'bg-tag-neutral-bg text-tag-neutral-text',
  mistral: 'bg-tag-lavender-bg text-tag-lavender-text',
};

function getFamilyColor(family: LocalLLMModelFamily): string {
  return FAMILY_COLORS[family] ?? FAMILY_COLORS['generic-instruct']!;
}

// ── Capability config ────────────────────────────────────────────────────────

const CAPABILITY_CONFIG: Record<ModelCapability, { label: string; icon: React.ElementType }> = {
  chat: { label: '채팅', icon: MessageSquare },
  code: { label: '코딩', icon: Code },
  reasoning: { label: '추론', icon: Brain },
  embedding: { label: '임베딩', icon: Search },
  vision: { label: '비전', icon: Eye },
  tools: { label: '도구', icon: Zap },
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
  onCancelDownload,
  isDownloading,
  downloadProgress = 0,
  downloadError,
  isLoading,
}: ModelCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isInstalled = installedModel?.status === 'ready' || installedModel?.status === 'active';

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border bg-card p-5 transition-all shadow-2xs ${
        isActive
          ? 'border-foreground/60 ring-1 ring-foreground/20'
          : 'border-border hover:border-foreground/20 hover:shadow-xs'
      }`}
    >
      <div>
        {/* Header row: name + family badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-card-foreground truncate">
              {model.name}
            </h4>
            {model.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {model.description}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${getFamilyColor(model.family)}`}
          >
            {model.family}
          </span>
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
            컨텍스트 {formatContextLength(model.contextLength)}
          </span>
        </div>

        {/* Capability badges */}
        <div className="flex flex-wrap gap-1 mb-4">
          {model.capabilities.map((cap) => {
            const config = CAPABILITY_CONFIG[cap];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <span
                key={cap}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                <Icon className="h-2.5 w-2.5" />
                {config.label}
              </span>
            );
          })}
        </div>
      </div>

      <div>
        {/* Status + download progress */}
        {isDownloading && (
          <div className="mb-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">다운로드 중...</span>
              <span className="font-semibold text-foreground">{downloadProgress}%</span>
            </div>
            <Progress value={downloadProgress} />
          </div>
        )}

        {/* Download failure */}
        {downloadError && !isDownloading && (
          <div className="mb-3 rounded-xl bg-destructive/10 px-3 py-1.5">
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
                <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                <span className="text-xs font-semibold text-success">
                  활성 상태 (Active)
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
              className="gap-1.5 rounded-xl bg-app-text text-app-bg hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" />
              다운로드
            </Button>
          )}

          {isDownloading && (
            <>
              <Button size="sm" disabled className="gap-1.5 rounded-xl">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                다운로드 중...
              </Button>
              {onCancelDownload && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCancelDownload(model.id)}
                  className="gap-1.5 rounded-xl"
                >
                  <X className="h-3.5 w-3.5" />
                  취소
                </Button>
              )}
            </>
          )}

          {isInstalled && !isActive && (
            isLoading ? (
              <Button size="sm" variant="outline" disabled className="gap-1.5 rounded-xl">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                로드 중...
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onLoad(model.id)}
                className="gap-1.5 rounded-xl"
              >
                <Zap className="h-3.5 w-3.5" />
                로드
              </Button>
            )
          )}

          {isActive && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onUnload(model.id)}
              className="gap-1.5 rounded-xl"
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
              className="gap-1 text-muted-foreground hover:text-destructive rounded-xl"
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
                className="gap-1 rounded-lg"
              >
                <Check className="h-3 w-3" />
                확인
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg"
              >
                취소
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
