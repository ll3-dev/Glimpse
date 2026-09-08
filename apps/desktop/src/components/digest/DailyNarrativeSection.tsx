import { RefreshCw, Feather } from 'lucide-react';
import { Button } from '@/components/ui/button';

type DailyNarrativeSectionProps = {
  narrative: string | null;
  isGenerating: boolean;
  onRegenerate: () => void;
};

/**
 * "오늘" 카드 아래의 AI 회고 문단 — 규칙 기반 카드의 증강 계층
 * (2026-09-08 digest-ai-narrative). 문단이 없으면 아무것도 렌더링하지
 * 않는다(조용한 폴백 — 카드 자체는 유지).
 */
export function DailyNarrativeSection({
  narrative,
  isGenerating,
  onRegenerate,
}: DailyNarrativeSectionProps) {
  if (!narrative && !isGenerating) return null;

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-2xs">
      <div className="flex items-start gap-2.5">
        <Feather className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          {isGenerating && !narrative ? (
            <p className="text-sm text-muted-foreground">오늘의 회고를 쓰는 중…</p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-foreground">{narrative}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1.5 h-7 px-2 text-xs text-muted-foreground"
                onClick={onRegenerate}
                disabled={isGenerating}
              >
                {isGenerating && <RefreshCw className="h-3 w-3 animate-spin" />}
                {!isGenerating && <RefreshCw className="h-3 w-3" />}
                다시 쓰기
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
