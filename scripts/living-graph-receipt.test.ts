import { describe, expect, test } from 'bun:test';
import { buildLivingGraphReceipt } from './living-graph-receipt';

const OPTIONS = {
  generatedAt: '2026-08-31T09:00:00.000Z',
  repetitions: 5,
  operationsPerSample: 2,
};

describe('Living Graph receipt', () => {
  test('콜드스타트·무변경·수정·삭제·동기화 시나리오를 검증한다', async () => {
    const receipt = await buildLivingGraphReceipt({ ...OPTIONS, seed: 'phase-d-a' });

    expect(receipt.schemaVersion).toBe(1);
    expect(receipt.scenarios.map(({ name }) => name)).toEqual([
      'cold_start',
      'unchanged',
      'updated',
      'deleted',
      'synced',
    ]);
    expect(receipt.scenarios[0].quality.analysis).toMatchObject({
      targetCount: 24,
      completedCount: 0,
      backlogCount: 24,
      reanalysisSkippedCount: 0,
    });
    expect(receipt.scenarios[1].quality.analysis).toMatchObject({
      completedCount: 24,
      backlogCount: 0,
      reanalysisSkippedCount: 24,
    });
    expect(receipt.scenarios[2].quality.analysis).toMatchObject({
      completedCount: 21,
      backlogCount: 3,
      reanalysisSkippedCount: 21,
    });
    expect(receipt.scenarios[3].quality).toMatchObject({
      analysis: { targetCount: 23, backlogCount: 0 },
      connections: { generatedCount: 11 },
    });
    expect(receipt.scenarios[4].quality.analysis).toMatchObject({
      targetCount: 26,
      completedCount: 24,
      backlogCount: 2,
    });
  });

  test('반복 시간은 유한한 min/p50/p95/max 분포로 기록한다', async () => {
    const receipt = await buildLivingGraphReceipt({ ...OPTIONS, seed: 'phase-d-a' });

    expect(receipt.repetitions).toBe(5);
    expect(receipt.operationsPerSample).toBe(2);
    for (const { timingMs } of receipt.scenarios) {
      expect(Object.values(timingMs).every(Number.isFinite)).toBe(true);
      expect(timingMs.min).toBeLessThanOrEqual(timingMs.p50);
      expect(timingMs.p50).toBeLessThanOrEqual(timingMs.p95);
      expect(timingMs.p95).toBeLessThanOrEqual(timingMs.max);
    }
  });

  test('seed별 입력 지문은 다르고 같은 트리의 build 지문은 같다', async () => {
    const [first, second] = await Promise.all([
      buildLivingGraphReceipt({ ...OPTIONS, seed: 'phase-d-a' }),
      buildLivingGraphReceipt({ ...OPTIONS, seed: 'phase-d-b' }),
    ]);

    expect(first.inputFingerprint).not.toBe(second.inputFingerprint);
    expect(first.buildFingerprint).toBe(second.buildFingerprint);
  });

  test('출력은 원문 필드와 raw seed를 포함하지 않는다', async () => {
    const rawSeed = 'private-seed-must-not-leak';
    const serialized = JSON.stringify(
      await buildLivingGraphReceipt({ ...OPTIONS, seed: rawSeed }),
    );

    expect(serialized).not.toContain(rawSeed);
    for (const privateField of [
      '"title"',
      '"body"',
      '"url"',
      '"tags"',
      '"summary"',
      '"reason"',
      '"prompt"',
      '"apiKey"',
    ]) {
      expect(serialized).not.toContain(privateField);
    }
  });
});
