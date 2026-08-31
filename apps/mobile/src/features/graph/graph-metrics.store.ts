import {
  createEmptyGraphLocalMetrics,
  parseGraphLocalMetrics,
  recordGraphCycleMetrics,
  recordGraphDiscoveryOpen,
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

export function recordMobileGraphCycle(sample: GraphCycleMetricSample): void {
  updateMobileGraphMetrics((current) => recordGraphCycleMetrics(current, sample));
}
