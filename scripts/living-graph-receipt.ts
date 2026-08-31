import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  computeLivingGraphQualityMetrics,
  type LivingGraphQualityMetrics,
} from '@glimpse/features';
import {
  assertScenarioQuality,
  createReceiptScenarios,
  fingerprintableScenarioInput,
  type ReceiptScenarioInput,
} from './living-graph-receipt-scenarios';

const WORKSPACE_ROOT = new URL('../', import.meta.url);
const BUILD_INPUTS = [
  'packages/features/src/graph/plan.ts',
  'packages/features/src/graph/metrics.ts',
  'scripts/living-graph-receipt-scenarios.ts',
  'scripts/living-graph-receipt.ts',
];
const RECEIPT_NOW = 10_000;

export interface LivingGraphReceipt {
  schemaVersion: 1;
  generatedAt: string;
  buildFingerprint: string;
  inputFingerprint: string;
  evidenceScope: 'synthetic-pure-planner-and-aggregation';
  runtime: { engine: 'bun'; version: string; platform: NodeJS.Platform; arch: string };
  repetitions: number;
  operationsPerSample: number;
  scenarios: Array<{
    name: ReceiptScenarioInput['name'];
    quality: LivingGraphQualityMetrics;
    timingMs: { min: number; p50: number; p95: number; max: number };
  }>;
}

interface BuildReceiptOptions {
  seed: string;
  generatedAt?: string;
  repetitions?: number;
  operationsPerSample?: number;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function buildFingerprint(): Promise<string> {
  const hash = createHash('sha256');
  for (const relativePath of BUILD_INPUTS) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(await Bun.file(new URL(relativePath, WORKSPACE_ROOT)).text());
    hash.update('\0');
  }
  return hash.digest('hex');
}

function validatePositiveInteger(name: string, value: number, maximum: number): number {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

function roundDuration(value: number): number {
  return Number(value.toFixed(6));
}

function percentile(sorted: number[], ratio: number): number {
  return sorted[Math.floor((sorted.length - 1) * ratio)];
}

function measureScenario(
  scenario: ReceiptScenarioInput,
  repetitions: number,
  operationsPerSample: number,
): LivingGraphReceipt['scenarios'][number] {
  const durations: number[] = [];
  let quality = computeLivingGraphQualityMetrics(
    scenario.items,
    scenario.recommendations,
    scenario.records,
    scenario.feedbackEvents,
    { now: RECEIPT_NOW },
  );
  assertScenarioQuality(scenario, quality);

  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    const startedAt = performance.now();
    for (let operation = 0; operation < operationsPerSample; operation += 1) {
      quality = computeLivingGraphQualityMetrics(
        scenario.items,
        scenario.recommendations,
        scenario.records,
        scenario.feedbackEvents,
        { now: RECEIPT_NOW },
      );
    }
    durations.push((performance.now() - startedAt) / operationsPerSample);
  }
  assertScenarioQuality(scenario, quality);
  durations.sort((left, right) => left - right);

  return {
    name: scenario.name,
    quality,
    timingMs: {
      min: roundDuration(durations[0]),
      p50: roundDuration(percentile(durations, 0.5)),
      p95: roundDuration(percentile(durations, 0.95)),
      max: roundDuration(durations[durations.length - 1]),
    },
  };
}

export async function buildLivingGraphReceipt(
  options: BuildReceiptOptions,
): Promise<LivingGraphReceipt> {
  const repetitions = validatePositiveInteger('repetitions', options.repetitions ?? 40, 1_000);
  const operationsPerSample = validatePositiveInteger(
    'operationsPerSample',
    options.operationsPerSample ?? 200,
    100_000,
  );
  const seedDigest = sha256(options.seed);
  const scenarios = createReceiptScenarios(seedDigest);

  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    buildFingerprint: await buildFingerprint(),
    inputFingerprint: sha256(JSON.stringify(fingerprintableScenarioInput(scenarios))),
    evidenceScope: 'synthetic-pure-planner-and-aggregation',
    runtime: {
      engine: 'bun',
      version: Bun.version,
      platform: process.platform,
      arch: process.arch,
    },
    repetitions,
    operationsPerSample,
    scenarios: scenarios.map((scenario) =>
      measureScenario(scenario, repetitions, operationsPerSample),
    ),
  };
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

async function runCli(): Promise<void> {
  const args = process.argv.slice(2).filter((argument) => argument !== '--');
  const seed = optionValue(args, '--seed') ?? `living-graph-${Date.now()}`;
  const output = optionValue(args, '--output');
  const repetitions = Number(optionValue(args, '--repetitions') ?? 40);
  const operationsPerSample = Number(optionValue(args, '--operations') ?? 200);
  const receipt = await buildLivingGraphReceipt({ seed, repetitions, operationsPerSample });
  const serialized = `${JSON.stringify(receipt, null, 2)}\n`;

  if (output) {
    const target = resolve(output);
    await mkdir(dirname(target), { recursive: true });
    await Bun.write(target, serialized);
    process.stdout.write(`${target}\n`);
    return;
  }
  process.stdout.write(serialized);
}

if (import.meta.main) {
  await runCli();
}
