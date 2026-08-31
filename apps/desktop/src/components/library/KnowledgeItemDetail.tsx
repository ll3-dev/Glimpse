import type { KnowledgeItem } from '@glimpse/shared';
import {
  Calendar,
  Tag,
  ExternalLink,
  Brain,
  BarChart3,
  Sparkles,
  Clock,
} from 'lucide-react';
import { formatKnowledgeLabel, getDisplayLabels } from '@/features/labeling';
import { KnowledgeItemDetailHeader } from './KnowledgeItemDetailHeader';

interface KnowledgeItemDetailProps {
  item: KnowledgeItem;
  onBack: () => void;
  onOpenGraph: () => void;
}

function formatDate(ts: number | null): string {
  if (!ts) return '없음';
  return new Date(ts).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function KnowledgeItemDetail({ item, onBack, onOpenGraph }: KnowledgeItemDetailProps) {
  const displayLabels = getDisplayLabels(item);

  return (
    <div className="flex h-full flex-col">
      <KnowledgeItemDetailHeader item={item} onBack={onBack} onOpenGraph={onOpenGraph} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto max-w-3xl space-y-7">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {item.title || '제목 없음'}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(item.createdAt)} 작성
            </p>
          </div>

          {/* Body */}
          {item.body && (
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                본문 내용
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {item.body}
              </p>
            </div>
          )}

          {/* URL */}
          {item.url && (
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                원문 링크
              </h3>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 break-all text-sm font-medium text-app-primary hover:underline"
              >
                {item.url}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </div>
          )}

          {/* Summary */}
          {item.summary && (
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-app-primary" />
                AI 요약
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{item.summary}</p>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                태그
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-tag-neutral-bg px-2.5 py-1 text-xs font-medium text-tag-neutral-text"
                  >
                    <Tag className="h-3 w-3 opacity-70" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Labels */}
          {displayLabels.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                지식 분류 라벨
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {displayLabels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {formatKnowledgeLabel(label)}
                  </span>
                ))}
              </div>
              {item.labelStatus && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-app-primary" />
                  <span>
                    {item.labelSource === 'rules' ? '규칙 기반' : item.labelSource ?? '자동'}
                    {' · '}
                    {item.labelStatus === 'final'
                      ? '완료'
                      : item.labelStatus === 'provisional'
                        ? '임시'
                        : item.labelStatus === 'pending'
                          ? '분석 중'
                          : item.labelStatus === 'failed'
                            ? '실패'
                            : '대기'}
                    {item.labelScore != null && ` · 점수 ${(item.labelScore * 100).toFixed(0)}%`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Review Info */}
          <div className="rounded-xl border border-border/70 bg-muted/40 p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              복습 상태
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>등록일: {formatDate(item.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>수정일: {formatDate(item.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Brain className="h-4 w-4 shrink-0" />
                <span>마지막 복습: {formatDate(item.lastReviewedAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="h-4 w-4 shrink-0" />
                <span>다음 복습: {formatDate(item.nextReviewAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
