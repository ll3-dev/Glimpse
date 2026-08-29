import type { KnowledgeItem, Recommendation } from '@glimpse/shared';

/** 다이제스트 "최근 연결" 섹션용 뷰 모델 — 엣지 + 양끝 아이템 제목. */
export interface RecentEdgeView {
  edgeId: string;
  itemIdA: string;
  itemIdB: string;
  titleA: string;
  titleB: string;
  reason: string | null;
}

/**
 * 최근 생성된 그래프 엣지(연결) 중 최신 `limit`개를 뷰 모델로 변환한다.
 *
 * `listRecommendations()`가 `created_at DESC` 정렬을 보장하므로 "최근"은
 * 그 순서의 접두사로 처리한다 — 별도 정렬·상태 필터 없이 전달된 순서 그대로
 * 순회하며, 한쪽 끝 아이템이 이미 삭제된(맵에 없는) 엣지는 건너뛴다.
 * 상태 필터(수락된 것만 등)는 호출부 책임이다.
 */
export function selectRecentEdges(
  edges: Recommendation[],
  items: KnowledgeItem[],
  limit = 3,
): RecentEdgeView[] {
  const byId = new Map<string, KnowledgeItem>();
  for (const item of items) {
    byId.set(item.id, item);
  }

  const views: RecentEdgeView[] = [];
  for (const edge of edges) {
    if (views.length >= limit) break;
    const itemA = byId.get(edge.itemA_id);
    const itemB = byId.get(edge.itemB_id);
    if (!itemA || !itemB) continue;
    views.push({
      edgeId: edge.id,
      itemIdA: edge.itemA_id,
      itemIdB: edge.itemB_id,
      titleA: itemA.title ?? '(제목 없음)',
      titleB: itemB.title ?? '(제목 없음)',
      reason: edge.reason,
    });
  }
  return views;
}
