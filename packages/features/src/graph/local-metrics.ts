export interface GraphLocalMetrics {
  version: 1;
  discoveryDetailOpenCount: number;
  cycleCount: number;
  successfulCycleCount: number;
  failedCycleCount: number;
  totalProcessedCount: number;
  totalSkippedCount: number;
  totalDurationMs: number;
  recentDurationsMs: number[];
  lastCycleAt: number | null;
}

export const MAX_GRAPH_DURATION_SAMPLES = 20;

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function safeNumber(value: number): number {
  return finiteNonNegative(value) ? value : 0;
}

export function createEmptyGraphLocalMetrics(): GraphLocalMetrics {
  return {
    version: 1,
    discoveryDetailOpenCount: 0,
    cycleCount: 0,
    successfulCycleCount: 0,
    failedCycleCount: 0,
    totalProcessedCount: 0,
    totalSkippedCount: 0,
    totalDurationMs: 0,
    recentDurationsMs: [],
    lastCycleAt: null,
  };
}

export function parseGraphLocalMetrics(raw: string | null | undefined): GraphLocalMetrics {
  if (!raw) return createEmptyGraphLocalMetrics();

  try {
    const value = JSON.parse(raw) as Partial<GraphLocalMetrics>;
    const numericKeys: Array<keyof GraphLocalMetrics> = [
      'discoveryDetailOpenCount',
      'cycleCount',
      'successfulCycleCount',
      'failedCycleCount',
      'totalProcessedCount',
      'totalSkippedCount',
      'totalDurationMs',
    ];
    if (
      value.version !== 1 ||
      numericKeys.some((key) => !finiteNonNegative(value[key])) ||
      !Array.isArray(value.recentDurationsMs) ||
      value.recentDurationsMs.some((duration) => !finiteNonNegative(duration)) ||
      !(value.lastCycleAt === null || finiteNonNegative(value.lastCycleAt))
    ) {
      return createEmptyGraphLocalMetrics();
    }
    return {
      version: 1,
      discoveryDetailOpenCount: value.discoveryDetailOpenCount!,
      cycleCount: value.cycleCount!,
      successfulCycleCount: value.successfulCycleCount!,
      failedCycleCount: value.failedCycleCount!,
      totalProcessedCount: value.totalProcessedCount!,
      totalSkippedCount: value.totalSkippedCount!,
      totalDurationMs: value.totalDurationMs!,
      recentDurationsMs: value.recentDurationsMs.slice(-MAX_GRAPH_DURATION_SAMPLES),
      lastCycleAt: value.lastCycleAt!,
    };
  } catch {
    return createEmptyGraphLocalMetrics();
  }
}

export function recordGraphDiscoveryOpen(current: GraphLocalMetrics): GraphLocalMetrics {
  return {
    ...current,
    discoveryDetailOpenCount: current.discoveryDetailOpenCount + 1,
  };
}

export function recordGraphCycleMetrics(
  current: GraphLocalMetrics,
  sample: {
    succeeded: boolean;
    durationMs: number;
    processedCount: number;
    skippedCount: number;
    recordedAt: number;
  },
): GraphLocalMetrics {
  const durationMs = safeNumber(sample.durationMs);
  return {
    ...current,
    cycleCount: current.cycleCount + 1,
    successfulCycleCount: current.successfulCycleCount + (sample.succeeded ? 1 : 0),
    failedCycleCount: current.failedCycleCount + (sample.succeeded ? 0 : 1),
    totalProcessedCount: current.totalProcessedCount + safeNumber(sample.processedCount),
    totalSkippedCount: current.totalSkippedCount + safeNumber(sample.skippedCount),
    totalDurationMs: current.totalDurationMs + durationMs,
    recentDurationsMs: [...current.recentDurationsMs, durationMs].slice(
      -MAX_GRAPH_DURATION_SAMPLES,
    ),
    lastCycleAt: safeNumber(sample.recordedAt),
  };
}
