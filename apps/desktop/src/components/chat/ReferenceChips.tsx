import { useNavigate } from '@tanstack/react-router';
import { BookOpen } from 'lucide-react';

export interface ChatReference {
  itemId: string;
  title: string;
  score: number;
}

/**
 * 어시스턴트 메시지 아래에 붙는 "참조한 노트" 칩 행. 칩 클릭 시 해당
 * 라이브러리 항목으로 이동한다. 참조가 없으면 아무것도 렌더하지 않는다.
 */
export function ReferenceChips({ references }: { references: ChatReference[] }) {
  const navigate = useNavigate();
  if (references.length === 0) return null;
  return (
    <div role="group" aria-label="참조한 노트" className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <BookOpen className="h-3 w-3" />
        참조한 노트
      </span>
      {references.map((ref) => (
        <button
          key={ref.itemId}
          type="button"
          title={`유사도 ${(ref.score * 100).toFixed(0)}%`}
          onClick={() => navigate({ to: '/library/$itemId', params: { itemId: ref.itemId } })}
          className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30"
        >
          {ref.title || '(제목 없음)'}
        </button>
      ))}
    </div>
  );
}
