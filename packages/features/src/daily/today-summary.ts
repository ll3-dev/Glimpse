/**
 * "오늘" 요약 — 하루 회고의 순수 계산 코어.
 *
 * 캡처 퍼널의 재방문 앵커로 쓰인다: 오늘 저장한 항목과 오늘 발견된 연결을
 * 모아 다이제스트 상단 카드가 소비한다. 타임스탬프는 `Date.now()` ms이며
 * 하루 경계는 로컬 자정으로 잡는다(일기 앱의 "오늘" 관례).
 */

import type { KnowledgeItem, KnowledgeItemType, Recommendation } from '@glimpse/shared';

export const TODAY_SUMMARY_PREVIEW_LIMIT = 5;
export const TODAY_SUMMARY_PREVIEW_MAX_LENGTH = 120;

export interface TodaySummaryEntry {
  id: string;
  title: string | null;
  preview: string;
  type: KnowledgeItemType;
  createdAt: number;
}

export interface TodaySummary {
  /** 오늘(로컬 자정 이후) 생성된 항목 수. */
  captureCount: number;
  /** 오늘 항목의 미리보기 — 최신순, 최대 TODAY_SUMMARY_PREVIEW_LIMIT. */
  captures: TodaySummaryEntry[];
  /** 오늘 생성된 연결(추천 엣지) 수 — 상태 무관. */
  newConnectionCount: number;
}

/** 로컬 자정(하루 시작)을 ms 타임스탬프로 돌려준다. */
export function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function buildPreview(item: KnowledgeItem): string {
  const source =
    item.summary?.trim() || item.body?.trim() || item.url?.trim() || item.title?.trim() || '';
  if (source.length <= TODAY_SUMMARY_PREVIEW_MAX_LENGTH) return source;
  return `${source.slice(0, TODAY_SUMMARY_PREVIEW_MAX_LENGTH - 1)}…`;
}

export function buildTodaySummary(
  items: KnowledgeItem[],
  recommendations: Recommendation[],
  options?: { now?: () => number },
): TodaySummary {
  const now = options?.now?.() ?? Date.now();
  const dayStart = startOfLocalDay(new Date(now));

  const todaysItems = items.filter((item) => item.createdAt >= dayStart);
  todaysItems.sort((a, b) => b.createdAt - a.createdAt);

  const newConnectionCount = recommendations.filter(
    (recommendation) => recommendation.createdAt >= dayStart,
  ).length;

  return {
    captureCount: todaysItems.length,
    captures: todaysItems.slice(0, TODAY_SUMMARY_PREVIEW_LIMIT).map((item) => ({
      id: item.id,
      title: item.title,
      preview: buildPreview(item),
      type: item.type,
      createdAt: item.createdAt,
    })),
    newConnectionCount,
  };
}
