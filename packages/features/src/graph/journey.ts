import type { GraphLocalMetrics } from './local-metrics';

/**
 * Content-free local journey observation (capture → discovery → revisit).
 *
 * Steps store only bounded hashed item identifiers and timestamps. Titles,
 * content, URLs, prompts, and API keys are never persisted, and nothing here
 * leaves the device. Steps expire after a short TTL and the array is bounded.
 */

export type GraphJourneyStepKind = 'capture' | 'discovery' | 'revisit';

export interface GraphJourneyStep {
  kind: GraphJourneyStepKind;
  /** Hashed item identifiers only — 1 key for capture/revisit, 2 for discovery. */
  itemKeys: string[];
  at: number;
}

/** Short-lived hashed identifiers: steps older than this are pruned. */
export const GRAPH_JOURNEY_STEP_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_GRAPH_JOURNEY_STEPS = 60;
/** Identical consecutive events within this cooldown are treated as one event. */
export const GRAPH_JOURNEY_DEDUPE_COOLDOWN_MS = 60_000;
/** A discovery correlates with a capture only within this window after the capture. */
export const GRAPH_JOURNEY_LINK_WINDOW_MS = GRAPH_JOURNEY_STEP_TTL_MS;
export const MAX_GRAPH_JOURNEY_LATENCY_SAMPLES = 20;

const STEP_KINDS: readonly GraphJourneyStepKind[] = ['capture', 'discovery', 'revisit'];
const HASH_PATTERN = /^[0-9a-f]{1,16}$/;

/** FNV-1a 32-bit hex digest. Keeps raw item ids out of local diagnostics storage. */
export function hashGraphItemId(id: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function parseGraphJourneyStep(value: unknown): GraphJourneyStep | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<GraphJourneyStep>;
  if (!STEP_KINDS.includes(candidate.kind as GraphJourneyStepKind)) return null;
  if (!Array.isArray(candidate.itemKeys) || candidate.itemKeys.length === 0) return null;
  if (candidate.itemKeys.length > 2) return null;
  if (!candidate.itemKeys.every((key) => typeof key === 'string' && HASH_PATTERN.test(key))) {
    return null;
  }
  if (!isFiniteNonNegative(candidate.at)) return null;
  return { kind: candidate.kind as GraphJourneyStepKind, itemKeys: [...candidate.itemKeys], at: candidate.at };
}

function sameKeys(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length
    && [...left].sort().every((key, index) => key === [...right].sort()[index]);
}

/** Drops expired steps and enforces the bounded array. */
export function pruneGraphJourneySteps(steps: GraphJourneyStep[], now: number): GraphJourneyStep[] {
  const floor = now - GRAPH_JOURNEY_STEP_TTL_MS;
  return steps.filter((step) => step.at >= floor).slice(-MAX_GRAPH_JOURNEY_STEPS);
}

/**
 * Appends a journey step with expiry pruning, bound enforcement, and dedupe
 * (same kind + same keys within the cooldown is treated as one event).
 */
export function recordGraphJourneyStep(
  current: GraphLocalMetrics,
  step: { kind: GraphJourneyStepKind; itemKeys: string[]; at: number },
): GraphLocalMetrics {
  const parsed = parseGraphJourneyStep(step);
  if (!parsed) return current;
  const steps = pruneGraphJourneySteps(current.journeySteps, parsed.at);
  const last = steps[steps.length - 1];
  if (
    last
    && last.kind === parsed.kind
    && parsed.at - last.at <= GRAPH_JOURNEY_DEDUPE_COOLDOWN_MS
    && sameKeys(last.itemKeys, parsed.itemKeys)
  ) {
    return current;
  }
  return { ...current, journeySteps: [...steps, parsed].slice(-MAX_GRAPH_JOURNEY_STEPS) };
}

export interface GraphJourneyMetrics {
  /** Denominators: non-expired, deduped event counts per kind. */
  captureCount: number;
  discoveryCount: number;
  revisitCount: number;
  /** Discoveries whose card contained a previously captured item. */
  captureToDiscoveryCount: number;
  captureToDiscoveryRatio: number;
  captureToDiscoveryLatenciesMs: number[];
  /** Detail revisits of items surfaced by an earlier discovery card open. */
  discoveryToRevisitCount: number;
  discoveryToRevisitRatio: number;
  discoveryToRevisitLatenciesMs: number[];
}

function emptyJourneyMetrics(): GraphJourneyMetrics {
  return {
    captureCount: 0,
    discoveryCount: 0,
    revisitCount: 0,
    captureToDiscoveryCount: 0,
    captureToDiscoveryRatio: 0,
    captureToDiscoveryLatenciesMs: [],
    discoveryToRevisitCount: 0,
    discoveryToRevisitRatio: 0,
    discoveryToRevisitLatenciesMs: [],
  };
}

function intersect(left: readonly string[], right: readonly string[]): boolean {
  return left.some((key) => right.includes(key));
}

/**
 * Pure aggregation over non-expired journey steps. Each capture and each
 * discovery is attributed at most once, so an unrelated later discovery cycle
 * can never be counted as correlated with an earlier capture. Denominators are
 * the observed event counts, never the matched counts.
 */
export function computeGraphJourneyMetrics(
  current: GraphLocalMetrics,
  options: { now: number },
): GraphJourneyMetrics {
  const steps = pruneGraphJourneySteps(current.journeySteps, options.now);
  const result = emptyJourneyMetrics();
  for (const step of steps) {
    if (step.kind === 'capture') result.captureCount += 1;
    if (step.kind === 'discovery') result.discoveryCount += 1;
    if (step.kind === 'revisit') result.revisitCount += 1;
  }

  const captureConsumed = new Set<number>();
  for (const step of steps) {
    if (step.kind !== 'discovery') continue;
    let matchIndex = -1;
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      const candidate = steps[index];
      if (
        candidate.kind === 'capture'
        && !captureConsumed.has(index)
        && step.at - candidate.at <= GRAPH_JOURNEY_LINK_WINDOW_MS
        && intersect(candidate.itemKeys, step.itemKeys)
      ) {
        matchIndex = index;
        break;
      }
    }
    if (matchIndex >= 0) {
      captureConsumed.add(matchIndex);
      result.captureToDiscoveryCount += 1;
      result.captureToDiscoveryLatenciesMs = [
        ...result.captureToDiscoveryLatenciesMs,
        step.at - steps[matchIndex].at,
      ].slice(-MAX_GRAPH_JOURNEY_LATENCY_SAMPLES);
    }
  }

  const discoveryConsumed = new Set<number>();
  for (const step of steps) {
    if (step.kind !== 'revisit') continue;
    let matchIndex = -1;
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      const candidate = steps[index];
      if (
        candidate.kind === 'discovery'
        && !discoveryConsumed.has(index)
        && step.at - candidate.at <= GRAPH_JOURNEY_LINK_WINDOW_MS
        && intersect(candidate.itemKeys, step.itemKeys)
      ) {
        matchIndex = index;
        break;
      }
    }
    if (matchIndex >= 0) {
      discoveryConsumed.add(matchIndex);
      result.discoveryToRevisitCount += 1;
      result.discoveryToRevisitLatenciesMs = [
        ...result.discoveryToRevisitLatenciesMs,
        step.at - steps[matchIndex].at,
      ].slice(-MAX_GRAPH_JOURNEY_LATENCY_SAMPLES);
    }
  }

  result.captureToDiscoveryRatio = result.captureCount === 0
    ? 0
    : result.captureToDiscoveryCount / result.captureCount;
  result.discoveryToRevisitRatio = result.discoveryCount === 0
    ? 0
    : result.discoveryToRevisitCount / result.discoveryCount;
  return result;
}
