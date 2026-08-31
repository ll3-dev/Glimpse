import {
  createEmptyGraphLocalMetrics,
  parseGraphLocalMetrics,
  recordGraphCycleMetrics,
  recordGraphDiscoveryOpen,
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

export function recordDesktopGraphCycle(sample: GraphCycleMetricSample): void {
  updateDesktopGraphMetrics((current) => recordGraphCycleMetrics(current, sample));
}
