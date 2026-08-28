import type { CoreClient, KnowledgeItem } from '@glimpse/shared';

/** 라벨링 파이프라인 활성화 이전 항목(null) 중 처리 가능한 것을 선별한다. */
export function selectItemsForBackfill(items: KnowledgeItem[]): KnowledgeItem[] {
  const hasText = (i: KnowledgeItem) =>
    (i.body != null && i.body.trim().length > 0) ||
    (i.title != null && i.title.trim().length > 0);
  return items.filter((i) => i.labelStatus == null && hasText(i));
}

export interface LabelingBackfillDeps {
  coreClient: Pick<CoreClient, 'listKnowledgeItems' | 'updateKnowledgeItem'>;
  /** 재실행 방지 플래그. 버전이 바뀌면 재백필. */
  getCompletedBackfillVersion: () => number;
  setCompletedBackfillVersion: (version: number) => void;
  now?: () => number;
}

export const LABELING_BACKFILL_VERSION = 1;

/**
 * 활성화 이전 저장분을 기존 라벨링 큐(pending)에 편입시킨다.
 * 마킹이 하나라도 실패하면 플래그를 남기지 않아 다음 시작에 재시도한다.
 */
export async function runLabelingBackfill(deps: LabelingBackfillDeps): Promise<{ markedCount: number }> {
  if (deps.getCompletedBackfillVersion() >= LABELING_BACKFILL_VERSION) {
    return { markedCount: 0 };
  }
  const all = await deps.coreClient.listKnowledgeItems();
  const targets = selectItemsForBackfill(all);
  const now = deps.now ?? Date.now;
  let markedCount = 0;
  let failed = false;
  for (const target of targets) {
    try {
      await deps.coreClient.updateKnowledgeItem(target.id, {
        labelStatus: 'pending',
        labelRequestedAt: now(),
        updatedAt: now(),
      });
      markedCount += 1;
    } catch {
      failed = true; // 개별 실패는 건너뛰고 계속
    }
  }
  if (!failed) {
    deps.setCompletedBackfillVersion(LABELING_BACKFILL_VERSION);
  }
  return { markedCount };
}
