import type { RecentEdgeView } from '@/features/digest/recent-edges';
import { Link2, ArrowRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';

/**
 * 다이제스트 최상단 "최근 연결" 섹션 — 최근 생성된 그래프 엣지(수락된 연결)
 * 중 최신 3개를 표시한다. 새 LLM 호출 없이 기존 엣지 데이터만 보여준다.
 */
export function RecentEdgesSection({ edges }: { edges: RecentEdgeView[] }) {
  if (edges.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-app-primary">
        <Link2 className="h-3.5 w-3.5" />
        최근 연결
      </div>
      <div className="flex flex-col gap-2">
        {edges.map((edge) => (
          <div
            key={edge.edgeId}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-2xs"
          >
            <Link
              to="/library/$itemId"
              params={{ itemId: edge.itemIdA }}
              className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground hover:underline"
            >
              {edge.titleA}
            </Link>
            <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <ArrowRight className="h-3 w-3" />
            </span>
            <Link
              to="/library/$itemId"
              params={{ itemId: edge.itemIdB }}
              className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground hover:underline"
            >
              {edge.titleB}
            </Link>
            {edge.reason && (
              <p className="hidden min-w-0 max-w-[40%] truncate text-xs text-muted-foreground md:block">
                {edge.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
