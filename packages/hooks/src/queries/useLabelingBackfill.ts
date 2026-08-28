import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CoreClient } from '@glimpse/shared';
import { LABELING_BACKFILL_VERSION, runLabelingBackfill } from '@glimpse/features';
import { useOptionalCoreClient } from '../core-client-context';
import { queryKeys } from '../query-keys';

export interface LabelingBackfillStorage {
  getCompletedBackfillVersion(): number;
  setCompletedBackfillVersion(version: number): void;
}

/**
 * 앱 시작 시 1회, 활성화 이전 미라벨 항목을 pending 큐에 편입한다.
 * 실제 라벨링은 기존 포그라운드/백그라운드 큐가 점진 소화한다.
 * coreClient는 컨텍스트에서 읽되, 미제공 환경에서는 조용히 건너뛴다.
 */
export function useLabelingBackfill(storage: LabelingBackfillStorage): void {
  const coreClient = useOptionalCoreClient();
  const queryClient = useQueryClient();
  const storageRef = useRef(storage);
  storageRef.current = storage;
  const ranRef = useRef(false);

  useEffect(() => {
    if (!coreClient || ranRef.current) return;
    ranRef.current = true;
    void runLabelingBackfill({
      coreClient,
      getCompletedBackfillVersion: () => storageRef.current.getCompletedBackfillVersion(),
      setCompletedBackfillVersion: (v) => storageRef.current.setCompletedBackfillVersion(v),
    })
      .then((result) => {
        if (result.markedCount > 0) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeItems.all });
        }
      })
      .catch(() => undefined);
  }, [coreClient, queryClient]);
}
