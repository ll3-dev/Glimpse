import { CalendarDays } from 'lucide-react';
import type { TodaySummary } from '@glimpse/features';

type TodaySummarySectionProps = {
  summary: TodaySummary;
  onPressEntry?: (itemId: string) => void;
};

/**
 * 다이제스트 상단의 "오늘" 섹션 — 오늘 저장한 기록과 새로 발견된 연결을
 * 모아 하루 회고의 재방문 앵커로 쓰인다.
 */
export function TodaySummarySection({ summary, onPressEntry }: TodaySummarySectionProps) {
  const isEmpty = summary.captureCount === 0 && summary.newConnectionCount === 0;

  return (
    <section className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-2xs">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">오늘</h2>
        {!isEmpty && (
          <span className="ml-auto text-xs font-medium text-muted-foreground">
            기록 {summary.captureCount} · 새 연결 {summary.newConnectionCount}
          </span>
        )}
      </div>

      {isEmpty ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          아직 오늘 남긴 기록이 없어요. 전역 캡처(Ctrl/Cmd+Shift+K)로 몇 초 만에
          남겨볼 수 있어요.
        </p>
      ) : (
        <ul className="space-y-2">
          {summary.captures.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onPressEntry?.(entry.id)}
                className="flex w-full items-center gap-2.5 rounded-md px-1 py-0.5 text-left hover:bg-muted/60"
              >
                <span className="text-xs uppercase text-muted-foreground">
                  {entry.type}
                </span>
                <span className="flex-1 truncate text-sm text-foreground">
                  {entry.title?.trim() || entry.preview || '제목 없음'}
                </span>
              </button>
            </li>
          ))}
          {summary.captureCount > summary.captures.length && (
            <li className="text-xs text-muted-foreground">
              외 {summary.captureCount - summary.captures.length}개 기록 · 새 연결{' '}
              {summary.newConnectionCount}
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
