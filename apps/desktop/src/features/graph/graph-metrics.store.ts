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

const GRAPH_METRICS_KEY = 'glimpse_graph_local_metrics_v1';

export function loadDesktopGraphMetrics(): GraphLocalMetrics {
  try {
    return parseGraphLocalMetrics(localStorage.getItem(GRAPH_METRICS_KEY));
  } catch {
    return createEmptyGraphLocalMetrics();
  }
}

function updateDesktopGraphMetrics(
  transform: (current: GraphLocalMetrics) => GraphLocalMetrics,
): void {
  try {
    const next = transform(loadDesktopGraphMetrics());
    localStorage.setItem(GRAPH_METRICS_KEY, JSON.stringify(next));
  } catch {
    // Local diagnostics must never interrupt graph generation or navigation.
  }
}

export function recordDesktopGraphDiscoveryOpen(): void {
  updateDesktopGraphMetrics(recordGraphDiscoveryOpen);
}

/** Capture 성공 직후 — hashed id만 저장한다(내용·제목·URL 금지). */
export function recordDesktopGraphCaptureSuccess(itemId: string): void {
  updateDesktopGraphMetrics((current) =>
    recordGraphJourneyStep(current, {
      kind: 'capture',
      itemKeys: [hashGraphItemId(itemId)],
      at: Date.now(),
    }));
}

/** 발견 카드 항목 열기 — 카드에 포함된 두 항목의 해시 쌍을 함께 기록한다. */
export function recordDesktopGraphDiscoveryOpened(itemAId: string, itemBId: string): void {
  updateDesktopGraphMetrics((current) => {
    const withCount = recordGraphDiscoveryOpen(current);
    return recordGraphJourneyStep(withCount, {
      kind: 'discovery',
      itemKeys: [hashGraphItemId(itemAId), hashGraphItemId(itemBId)],
      at: Date.now(),
    });
  });
}

/** 지식 항목 상세 열기(revisit). */
export function recordDesktopGraphItemDetailOpened(itemId: string): void {
  updateDesktopGraphMetrics((current) =>
    recordGraphJourneyStep(current, {
      kind: 'revisit',
      itemKeys: [hashGraphItemId(itemId)],
      at: Date.now(),
    }));
}

export function recordDesktopGraphCycle(sample: GraphCycleMetricSample): void {
  updateDesktopGraphMetrics((current) => recordGraphCycleMetrics(current, sample));
}
