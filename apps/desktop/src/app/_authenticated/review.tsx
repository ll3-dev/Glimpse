import { createFileRoute } from '@tanstack/react-router';
import {
  useDueItemsQuery,
  useMarkAsForgottenMutation,
  useMarkAsReviewedMutation,
  usePostponeReviewMutation,
} from '@glimpse/hooks';
import type { KnowledgeItem } from '@glimpse/shared';
import { Brain } from 'lucide-react';
import { ReviewDeck } from '@/components/review/ReviewDeck';

function ReviewScreen() {
  const { data: items = [], isLoading, isError, refetch } = useDueItemsQuery();
  const markAsReviewed = useMarkAsReviewedMutation();
  const markAsForgotten = useMarkAsForgottenMutation();
  const postponeReview = usePostponeReviewMutation();

  // 갈라짐 방지: 간격·안정성·난이도 산출은 @glimpse/features의 공유
  // 스케줄러(scheduleNextReview)가 훅 내부에서 단일 수행한다. 데스크톱은
  // 아이템만 넘기고 결정을 받아 저장한다 — 모바일 reviewActions와 동일 경로.
  const handleRemembered = async (item: KnowledgeItem) => {
    await markAsReviewed.mutateAsync({ item });
  };

  const handleForgotten = async (item: KnowledgeItem) => {
    await markAsForgotten.mutateAsync({ item });
  };

  const handlePostponed = async (item: KnowledgeItem) => {
    await postponeReview.mutateAsync({ item });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        {/* Page header */}
        <div className="mb-8 text-center">
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-md bg-tag-mint-bg px-2.5 py-1 text-xs font-medium text-tag-mint-text">
            <Brain className="h-3.5 w-3.5" />
            간격 반복 (Spaced Repetition)
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">다시 보기</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            기억을 오래 유지하기 위해 주기적으로 지식을 복습합니다.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
            <p className="text-xs text-muted-foreground">복습할 항목을 불러오는 중...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-destructive">복습 항목을 불러오지 못했습니다.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              다시 시도
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-muted/60 text-muted-foreground shadow-2xs">
              <Brain className="h-6 w-6 opacity-70" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              오늘 복습할 항목이 없습니다
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              훌륭합니다! 다음 복습 주기가 되면 다시 알려드릴게요.
            </p>
          </div>
        ) : (
          <ReviewDeck
            items={items}
            onRemembered={handleRemembered}
            onForgotten={handleForgotten}
            onPostponed={handlePostponed}
          />
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/review')({
  component: ReviewScreen,
});
