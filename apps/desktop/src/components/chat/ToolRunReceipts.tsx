import { Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolRunSummary } from '@/features/ai/tools/tool-loop';

/**
 * 도구 실행 영수증 — 어시스턴트 답변 아래에 붙는 실행 기록. 도구가
 * 라이브러리를 변경(save_note)할 수 있는 이상 무엇이 실행됐는지 가리지
 * 않는다(투명성 계약). 응답 완료 시 한 번 만들어지는 안정 배열만 받는다.
 */
export function ToolRunReceipts({ runs }: { runs: ToolRunSummary[] }) {
  if (runs.length === 0) return null;
  return (
    <div className="mt-2 space-y-1" aria-label="도구 실행 기록">
      {runs.map((run, index) => (
        <div
          key={index}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <Wrench className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
          <span className="font-medium">{run.label}</span>
          <span className={cn('opacity-80', !run.ok && 'text-destructive opacity-100')}>
            {run.detail}
          </span>
        </div>
      ))}
    </div>
  );
}
