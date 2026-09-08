import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { subscribeEvent } from '@rustra/tauri';
import { invoke } from '@tauri-apps/api/core';
import { CheckCircle2, CircleAlert, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DOWNLOAD_DONE_EVENT } from '@/features/local-llm/desktop-llm-service';
import {
  useDesktopLLMOverview,
  llmQueryKeys,
} from '@/features/local-llm/use-desktop-llm-overview';
import { useDownloadProgress } from '@/features/local-llm/use-model-management';

/**
 * 전역 모델 다운로드 배너 — 설정 화면을 벗어나도 진행을 볼 수 있게 한다.
 *
 * 다운로드 자체는 Rust 비동기 태스크라 화면 이동·창 숨김(트레이)과 무관하게
 * 계속되며, 이 배너는 그 진행/완료/실패를 모든 화면 우하단에 띄운다.
 * 완료 카드는 잠시 후 자동으로 사라진다.
 */

/** 완료 카드 자동 소멸 시간 */
const COMPLETION_CARD_TTL_MS = 8000;

interface CompletionCard {
  modelId: string;
}

export function GlobalModelDownloadBanner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { progress, failures } = useDownloadProgress();
  const { data: overview } = useDesktopLLMOverview();
  const [completions, setCompletions] = useState<CompletionCard[]>([]);
  const [dismissedFailures, setDismissedFailures] = useState<string[]>([]);

  const modelName = (modelId: string): string =>
    overview?.models.find((model) => model.id === modelId)?.name ?? modelId;

  // 완료 이벤트 — 완료 카드 표시 + overview 무효화(설정 화면 상태 갱신).
  // 진행/실패는 useDownloadProgress가, 완료는 여기서 직접 구독한다.
  useEffect(() => {
    let disposed = false;
    const unlistens: Array<() => void> = [];
    const track = (fn: () => void) => {
      if (disposed) fn();
      else unlistens.push(fn);
    };

    subscribeEvent<{ modelId: string; path: string }>(
      DOWNLOAD_DONE_EVENT,
      (payload) => {
        void queryClient.invalidateQueries({ queryKey: llmQueryKeys.overview });
        setCompletions((prev) =>
          prev.some((card) => card.modelId === payload.modelId)
            ? prev
            : [...prev, { modelId: payload.modelId }],
        );
      },
      listen,
    ).then((fn) => track(fn));

    return () => {
      disposed = true;
      unlistens.forEach((fn) => fn());
    };
  }, [queryClient]);

  // 완료 카드 자동 소멸
  useEffect(() => {
    if (completions.length === 0) return;
    const timer = setTimeout(() => setCompletions([]), COMPLETION_CARD_TTL_MS);
    return () => clearTimeout(timer);
  }, [completions]);

  const activeDownloads = Object.values(progress);
  const activeFailures = Object.values(failures).filter(
    (failure) => !dismissedFailures.includes(failure.modelId),
  );

  const nothingToShow =
    activeDownloads.length === 0 &&
    completions.length === 0 &&
    activeFailures.length === 0;
  if (nothingToShow) return null;

  const cancel = (modelId: string) => {
    void invoke('cancel_download', { modelId });
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2.5">
      {activeDownloads.map((download) => (
        <div
          key={download.modelId}
          className="pointer-events-auto rounded-2xl border border-border bg-card p-4 shadow-lg"
          role="status"
          aria-label={`${modelName(download.modelId)} 다운로드 진행`}
        >
          <div className="flex items-center gap-2.5">
            <Download className="h-4 w-4 shrink-0 animate-pulse text-muted-foreground" />
            <p className="flex-1 truncate text-sm font-semibold text-foreground">
              {modelName(download.modelId)} 다운로드 중
            </p>
            <button
              type="button"
              onClick={() => cancel(download.modelId)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`${modelName(download.modelId)} 다운로드 취소`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2.5">
            <Progress value={download.percentage} className="h-1.5" />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {Math.round(download.percentage)}% · 백그라운드 다운로드 — 창을
              닫아도 계속됩니다
            </p>
          </div>
        </div>
      ))}

      {completions.map((card) => (
        <div
          key={card.modelId}
          className="pointer-events-auto rounded-2xl border border-border bg-card p-4 shadow-lg"
          role="status"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-app-primary" />
            <div className="flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {modelName(card.modelId)} 준비 완료
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-0.5 h-6 px-1.5 text-xs text-muted-foreground"
                onClick={() => navigate({ to: '/settings' })}
              >
                설정에서 로드하기
              </Button>
            </div>
            <button
              type="button"
              onClick={() =>
                setCompletions((prev) => prev.filter((c) => c.modelId !== card.modelId))
              }
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="완료 알림 닫기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {activeFailures.map((failure) => (
        <div
          key={failure.modelId}
          className="pointer-events-auto rounded-2xl border border-border bg-card p-4 shadow-lg"
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            <CircleAlert className="h-4 w-4 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {modelName(failure.modelId)} 다운로드 실패
              </p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                {failure.error}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-0.5 h-6 px-1.5 text-xs text-muted-foreground"
                onClick={() => navigate({ to: '/settings' })}
              >
                설정에서 다시 시도
              </Button>
            </div>
            <button
              type="button"
              onClick={() =>
                setDismissedFailures((prev) => [...prev, failure.modelId])
              }
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="실패 알림 닫기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
