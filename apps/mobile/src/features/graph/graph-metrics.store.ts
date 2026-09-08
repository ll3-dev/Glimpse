import {
  createEmptyGraphLocalMetrics,
  hashGraphItemId,
  parseGraphLocalMetrics,
  recordGraphCycleMetrics,
  recordGraphDiscoveryOpen,
  recordGraphJourneyStep,
  type GraphCycleMetricSample,
  type GraphLocalMetrics,
} from '@glimpse/features';
import { storage, StorageKeys } from '@/src/lib/storage';

export function loadMobileGraphMetrics(): GraphLocalMetrics {
  try {
    return parseGraphLocalMetrics(storage.getString(StorageKeys.GRAPH_LOCAL_METRICS));
  } catch {
    return createEmptyGraphLocalMetrics();
  }
}

function updateMobileGraphMetrics(
  transform: (current: GraphLocalMetrics) => GraphLocalMetrics,
): void {
  try {
    const next = transform(loadMobileGraphMetrics());
    storage.set(StorageKeys.GRAPH_LOCAL_METRICS, JSON.stringify(next));
  } catch {
    // Local diagnostics must never interrupt graph generation or navigation.
  }
}

export function recordMobileGraphDiscoveryOpen(): void {
  updateMobileGraphMetrics(recordGraphDiscoveryOpen);
}

/** Capture 성공 직후 — hashed id만 저장한다(내용·제목·URL 금지). */
export function recordMobileGraphCaptureSuccess(itemId: string): void {
  updateMobileGraphMetrics((current) =>
    recordGraphJourneyStep(current, {
      kind: 'capture',
      itemKeys: [hashGraphItemId(itemId)],
      at: Date.now(),
    }));
}

/** 발견 카드 항목 열기 — 카드에 포함된 두 항목의 해시 쌍을 함께 기록한다. */
export function recordMobileGraphDiscoveryOpened(itemAId: string, itemBId: string): void {
  updateMobileGraphMetrics((current) => {
    const withCount = recordGraphDiscoveryOpen(current);
    return recordGraphJourneyStep(withCount, {
      kind: 'discovery',
      itemKeys: [hashGraphItemId(itemAId), hashGraphItemId(itemBId)],
      at: Date.now(),
    });
  });
}

/** 지식 항목 상세 열기(revisit). */
export function recordMobileGraphItemDetailOpened(itemId: string): void {
  updateMobileGraphMetrics((current) =>
    recordGraphJourneyStep(current, {
      kind: 'revisit',
      itemKeys: [hashGraphItemId(itemId)],
      at: Date.now(),
    }));
}

export function recordMobileGraphCycle(sample: GraphCycleMetricSample): void {
  updateMobileGraphMetrics((current) => recordGraphCycleMetrics(current, sample));
}
