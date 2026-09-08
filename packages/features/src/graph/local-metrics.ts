import { parseGraphJourneyStep, pruneGraphJourneySteps, type GraphJourneyStep } from './journey';

export interface GraphLocalMetrics {
  version: 2;
  discoveryDetailOpenCount: number;
  cycleCount: number;
  successfulCycleCount: number;
  failedCycleCount: number;
  totalProcessedCount: number;
  totalSkippedCount: number;
  totalDurationMs: number;
  recentDurationsMs: number[];
  lastCycleAt: number | null;
  /** Content-free hashed journey steps (see ./journey). Bounded and short-lived. */
  journeySteps: GraphJourneyStep[];
}

export interface GraphCycleMetricSample {
  succeeded: boolean;
  durationMs: number;
  processedCount: number;
  skippedCount: number;
  recordedAt: number;
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
    version: 2,
    discoveryDetailOpenCount: 0,
    cycleCount: 0,
    successfulCycleCount: 0,
    failedCycleCount: 0,
    totalProcessedCount: 0,
    totalSkippedCount: 0,
    totalDurationMs: 0,
    recentDurationsMs: [],
    lastCycleAt: null,
    journeySteps: [],
  };
}

export function parseGraphLocalMetrics(
  raw: string | null | undefined,
  options?: { now?: number },
): GraphLocalMetrics {
  if (!raw) return createEmptyGraphLocalMetrics();

  try {
    const value = JSON.parse(raw) as Omit<Partial<GraphLocalMetrics>, 'version'> & {
      version?: unknown;
    };
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
      (value.version !== 1 && value.version !== 2) ||
      numericKeys.some((key) => !finiteNonNegative(value[key])) ||
      !Array.isArray(value.recentDurationsMs) ||
      value.recentDurationsMs.some((duration) => !finiteNonNegative(duration)) ||
      !(value.lastCycleAt === null || finiteNonNegative(value.lastCycleAt))
    ) {
      return createEmptyGraphLocalMetrics();
    }
    // v1 payloads migrate with counters intact and no journey steps; unknown
    // fields (which could carry content) are never carried through. Invalid v2
    // steps are dropped individually rather than corrupting the counters.
    const journeySteps = Array.isArray(value.journeySteps)
      ? value.journeySteps
        .map(parseGraphJourneyStep)
        .filter((step): step is GraphJourneyStep => step !== null)
      : [];
    return {
      version: 2,
      discoveryDetailOpenCount: value.discoveryDetailOpenCount!,
      cycleCount: value.cycleCount!,
      successfulCycleCount: value.successfulCycleCount!,
      failedCycleCount: value.failedCycleCount!,
      totalProcessedCount: value.totalProcessedCount!,
      totalSkippedCount: value.totalSkippedCount!,
      totalDurationMs: value.totalDurationMs!,
      recentDurationsMs: value.recentDurationsMs.slice(-MAX_GRAPH_DURATION_SAMPLES),
      lastCycleAt: value.lastCycleAt!,
      journeySteps: pruneGraphJourneySteps(journeySteps, options?.now ?? Date.now()),
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
  sample: GraphCycleMetricSample,
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
