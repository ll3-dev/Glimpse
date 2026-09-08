import { describe, expect, test } from 'bun:test';
import { createEmptyGraphLocalMetrics, parseGraphLocalMetrics } from './local-metrics';
import {
  GRAPH_JOURNEY_DEDUPE_COOLDOWN_MS,
  GRAPH_JOURNEY_LINK_WINDOW_MS,
  GRAPH_JOURNEY_STEP_TTL_MS,
  MAX_GRAPH_JOURNEY_LATENCY_SAMPLES,
  MAX_GRAPH_JOURNEY_STEPS,
  computeGraphJourneyMetrics,
  hashGraphItemId,
  pruneGraphJourneySteps,
  recordGraphJourneyStep,
} from './journey';

const NOW = 1_000_000_000;

function metricsWith(
  steps: Array<{ kind: 'capture' | 'discovery' | 'revisit'; itemKeys: string[]; at: number }>,
) {
  let metrics = createEmptyGraphLocalMetrics();
  for (const step of steps) {
    metrics = recordGraphJourneyStep(metrics, step);
  }
  return metrics;
}

describe('graph journey steps', () => {
  test('같은 이벤트가 쿨다운 내 반복되면 한 번만 기록된다(dedupe)', () => {
    const item = hashGraphItemId('item-1');
    let metrics = metricsWith([
      { kind: 'capture', itemKeys: [item], at: NOW },
      { kind: 'capture', itemKeys: [item], at: NOW + 1000 },
      { kind: 'revisit', itemKeys: [item], at: NOW + 2000 },
      { kind: 'revisit', itemKeys: [item], at: NOW + 2000 + GRAPH_JOURNEY_DEDUPE_COOLDOWN_MS },
    ]);

    expect(metrics.journeySteps).toHaveLength(2);
    expect(metrics.journeySteps[0]).toEqual({ kind: 'capture', itemKeys: [item], at: NOW });
    expect(metrics.journeySteps[1].kind).toBe('revisit');
  });

  test('TTL이 지난 단계는 만료되고 배열 상한이 강제된다(expiry, bound)', () => {
    const item = hashGraphItemId('item-1');
    let metrics = metricsWith([
      { kind: 'capture', itemKeys: [item], at: NOW },
      { kind: 'capture', itemKeys: [hashGraphItemId('item-2')], at: NOW + 1 },
    ]);

    expect(computeGraphJourneyMetrics(metrics, { now: NOW + GRAPH_JOURNEY_STEP_TTL_MS + 2 }).captureCount).toBe(0);
    expect(pruneGraphJourneySteps(metrics.journeySteps, NOW + GRAPH_JOURNEY_STEP_TTL_MS + 2)).toHaveLength(0);
    // TTL 경계(바닥값 == 단계 시각)는 아직 유효하다: 두 단계 모두 유지.
    expect(pruneGraphJourneySteps(metrics.journeySteps, NOW + 1 + GRAPH_JOURNEY_STEP_TTL_MS)).toHaveLength(1);

    for (let index = 0; index < MAX_GRAPH_JOURNEY_STEPS + 5; index += 1) {
      metrics = recordGraphJourneyStep(metrics, {
        kind: 'revisit',
        itemKeys: [hashGraphItemId(`item-${index}`)],
        at: NOW + 2 + index,
      });
    }
    expect(metrics.journeySteps).toHaveLength(MAX_GRAPH_JOURNEY_STEPS);
  });

  test('capture와 같은 항목을 포함한 discovery만 상관으로 계산한다(correlation)', () => {
    const captured = hashGraphItemId('captured-item');
    const unrelated = hashGraphItemId('unrelated-item');
    const metrics = metricsWith([
      { kind: 'capture', itemKeys: [captured], at: NOW },
      // 무관한 다음 discovery 사이클 — capture 상관으로 세면 안 된다.
      { kind: 'discovery', itemKeys: [unrelated, hashGraphItemId('other')], at: NOW + 60_000 },
      // capture 항목을 실제로 포함한 discovery — 이것만 상관이다.
      { kind: 'discovery', itemKeys: [captured, unrelated], at: NOW + 120_000 },
    ]);

    const journey = computeGraphJourneyMetrics(metrics, { now: NOW + 120_000 });
    expect(journey.captureCount).toBe(1);
    expect(journey.discoveryCount).toBe(2);
    expect(journey.captureToDiscoveryCount).toBe(1);
    expect(journey.captureToDiscoveryLatenciesMs).toEqual([120_000]);
    expect(journey.captureToDiscoveryRatio).toBe(1);
  });

  test('링크 윈도우를 넘은 discovery는 capture와 상관되지 않는다(latency bound)', () => {
    const item = hashGraphItemId('item-1');
    const metrics = metricsWith([
      { kind: 'capture', itemKeys: [item], at: NOW },
      { kind: 'discovery', itemKeys: [item], at: NOW + GRAPH_JOURNEY_LINK_WINDOW_MS + 1 },
    ]);

    const journey = computeGraphJourneyMetrics(metrics, { now: NOW + GRAPH_JOURNEY_LINK_WINDOW_MS + 1 });
    expect(journey.captureToDiscoveryCount).toBe(0);
    expect(journey.captureToDiscoveryRatio).toBe(0);
  });

  test('discovery → revisit 전환과 정확한 분모를 계산한다', () => {
    const surfaced = hashGraphItemId('surfaced-item');
    const other = hashGraphItemId('other-item');
    const metrics = metricsWith([
      { kind: 'capture', itemKeys: [other], at: NOW },
      { kind: 'discovery', itemKeys: [surfaced, other], at: NOW + 10_000 },
      { kind: 'revisit', itemKeys: [surfaced], at: NOW + 40_000 },
      { kind: 'revisit', itemKeys: [hashGraphItemId('no-discovery')], at: NOW + 50_000 },
      { kind: 'discovery', itemKeys: [hashGraphItemId('never-opened')], at: NOW + 60_000 },
    ]);

    const journey = computeGraphJourneyMetrics(metrics, { now: NOW + 60_000 });
    expect(journey.captureCount).toBe(1);
    expect(journey.discoveryCount).toBe(2);
    expect(journey.revisitCount).toBe(2);
    expect(journey.captureToDiscoveryCount).toBe(1);
    expect(journey.captureToDiscoveryRatio).toBe(1);
    expect(journey.discoveryToRevisitCount).toBe(1);
    expect(journey.discoveryToRevisitRatio).toBe(0.5);
    expect(journey.discoveryToRevisitLatenciesMs).toEqual([30_000]);
  });

  test('latency 표본 배열은 상한이 강제된다', () => {
    let metrics = createEmptyGraphLocalMetrics();
    let at = NOW;
    for (let index = 0; index < MAX_GRAPH_JOURNEY_LATENCY_SAMPLES + 5; index += 1) {
      metrics = recordGraphJourneyStep(metrics, {
        kind: 'capture', itemKeys: [hashGraphItemId(`c-${index}`)], at,
      });
      at += 1;
      metrics = recordGraphJourneyStep(metrics, {
        kind: 'discovery', itemKeys: [hashGraphItemId(`c-${index}`)], at,
      });
      at += 1;
    }

    const journey = computeGraphJourneyMetrics(metrics, { now: at });
    expect(journey.captureToDiscoveryLatenciesMs).toHaveLength(MAX_GRAPH_JOURNEY_LATENCY_SAMPLES);
  });

  test('빈 여정에서는 모든 비율이 0이다', () => {
    const journey = computeGraphJourneyMetrics(createEmptyGraphLocalMetrics(), { now: NOW });
    expect(journey.captureCount).toBe(0);
    expect(journey.captureToDiscoveryRatio).toBe(0);
    expect(journey.discoveryToRevisitRatio).toBe(0);
    expect(journey.captureToDiscoveryLatenciesMs).toEqual([]);
  });
});

describe('graph local metrics v2 migration', () => {
  test('v1 값은 카운터를 보존하고 여정 없이 v2로 이전된다(no-content)', () => {
    const v1 = {
      version: 1,
      discoveryDetailOpenCount: 3,
      cycleCount: 9,
      successfulCycleCount: 7,
      failedCycleCount: 2,
      totalProcessedCount: 11,
      totalSkippedCount: 13,
      totalDurationMs: 1200,
      recentDurationsMs: [100, 200],
      lastCycleAt: 500,
    };
    const migrated = parseGraphLocalMetrics(JSON.stringify(v1), { now: NOW });

    expect(migrated.version).toBe(2);
    expect(migrated.discoveryDetailOpenCount).toBe(3);
    expect(migrated.cycleCount).toBe(9);
    expect(migrated.successfulCycleCount).toBe(7);
    expect(migrated.failedCycleCount).toBe(2);
    expect(migrated.recentDurationsMs).toEqual([100, 200]);
    expect(migrated.lastCycleAt).toBe(500);
    expect(migrated.journeySteps).toEqual([]);
  });

  test('v2 값은 알 수 없는 필드와 잘못된 단계를 버리고 유효 단계만 유지한다', () => {
    const key = hashGraphItemId('item-1');
    const v2 = {
      version: 2,
      discoveryDetailOpenCount: 1,
      cycleCount: 0,
      successfulCycleCount: 0,
      failedCycleCount: 0,
      totalProcessedCount: 0,
      totalSkippedCount: 0,
      totalDurationMs: 0,
      recentDurationsMs: [],
      lastCycleAt: null,
      journeySteps: [
        { kind: 'capture', itemKeys: [key], at: NOW },
        { kind: 'suspicious', itemKeys: ['nothex'], at: NOW },
        { kind: 'revisit', itemKeys: [key], at: NOW + 1 },
      ],
      // 콘텐츠가 섞인 알 수 없는 필드는 절대 재구성 객체로 옮겨지지 않는다.
      leakedContent: 'private note body',
    };
    const parsed = parseGraphLocalMetrics(JSON.stringify(v2), { now: NOW + 2 });

    expect(parsed.version).toBe(2);
    expect(parsed.journeySteps).toHaveLength(2);
    expect(JSON.stringify(parsed)).not.toContain('private note body');
    expect(JSON.stringify(parsed)).not.toContain('suspicious');
  });

  test('알 수 없는 버전과 손상된 값은 빈 집계로 복구한다', () => {
    expect(parseGraphLocalMetrics('{bad json')).toEqual(createEmptyGraphLocalMetrics());
    expect(parseGraphLocalMetrics(JSON.stringify({ version: 3 }))).toEqual(
      createEmptyGraphLocalMetrics(),
    );
    expect(parseGraphLocalMetrics(null)).toEqual(createEmptyGraphLocalMetrics());
  });

  test('여정에는 콘텐츠 대신 해시만 저장된다', () => {
    const metrics = metricsWith([
      { kind: 'capture', itemKeys: [hashGraphItemId('note-with-private-body')], at: NOW },
    ]);

    expect(JSON.stringify(metrics)).not.toContain('note-with-private-body');
    expect(metrics.journeySteps[0].itemKeys[0]).toMatch(/^[0-9a-f]{8}$/);
  });
});
