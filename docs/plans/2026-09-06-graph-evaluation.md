# Graph Local Evaluation — Capture → Discovery → Revisit (2026-09-06)

Scope continuation of the Loop plan (`2026-09-01-next-work-without-deployment.md` §4) after the
orchestrator's terminal-review timeout. This worker owns only the graph evaluation slice.
Desktop AI CI fixes and mobile chat/search/config are owned by other workers and are not touched.
Deployment/signing/updater is excluded. No commits/push/deploy, no production device data mutations.

## Goal

Local-only, content-free journey observation: **capture success → discovery card open → item
revisit**, with bounded latency, on both platforms, using the existing local
`GraphLocalMetrics` persistence. No claims of measured user usefulness are made; a separate
one-week observation protocol defines what would be observed later.

## Constraints

- Never persist content, title, URL, prompt, or API key. No external telemetry.
- Bounded short-lived hashed item identifiers only (FNV-1a 32-bit hex, 24h TTL, max 60 steps).
- Accurate denominators; per-event dedupe; v1→v2 metrics migration without content.
- A capture correlates only with a discovery card that actually contains the captured item
  (hash intersection) — an unrelated next discovery cycle is never counted as correlated.

## Files

New
- `packages/features/src/graph/journey.ts` — step types/constants/hash, prune+dedupe+record,
  `computeGraphJourneyMetrics` pure aggregation (shared platform contract).
- `packages/features/src/graph/journey.test.ts` — correlation / dedupe / expiry / no-content
  migration / bounds / denominators.
- `thoughts/shared/research/2026-09-06_graph-journey-observation-protocol.md` — one-week
  observation protocol + verification receipt + real-model vs fake-vector evidence boundary.

Modified
- `packages/features/src/graph/local-metrics.ts` — `version: 2` + bounded `journeySteps`;
  parse accepts v1 (migrates, empty steps) and v2 (strict step validation, unknown fields dropped).
- `packages/features/src/graph/index.ts` — journey exports.
- `packages/features/src/graph/metrics.test.ts` — version expectations, migration test.
- `apps/mobile/src/features/graph/graph-metrics.store.ts` (+ test) —
  `recordMobileGraphCaptureSuccess / DiscoveryOpened(itemA,itemB) / ItemDetailOpened`.
- `apps/desktop/src/features/graph/graph-metrics.store.ts` (+ test) — desktop equivalents.
- `apps/mobile/src/hooks/mutations/useCaptureActions.ts` — capture-success journey event.
- `apps/desktop/src/components/capture/CaptureModal.tsx` — capture-success journey event.
- `apps/mobile/app/(tabs)/graph.tsx`, `apps/desktop/src/app/_authenticated/graph.tsx` —
  discovery open passes recommendation item pair.
- `apps/mobile/app/library/[id].tsx`,
  `apps/desktop/src/app/_authenticated/library/$itemId.tsx` — revisit (detail open) event.
- `apps/desktop/e2e/shell-capture-verify.ts`, `apps/desktop/e2e/graph-gui-verify.ts` —
  assert journey steps appear in local metrics (receipt of existing graph E2Es).
- `thoughts/shared/research/2026-08-31_remaining-manual-gates.md` — reconcile with Phase E
  verification (hotkey/tray already verified via OS physical input); deployment stays excluded.

## Acceptance

1. `bun test packages/features/src/graph` passes (existing + new journey tests).
2. `bun test apps/mobile/src/features/graph/graph-metrics.store.test.ts
   apps/desktop/src/features/graph/graph-metrics.store.test.ts` passes.
3. v1 metrics payload migrates to v2 with counters intact, `journeySteps: []`, no unknown
   fields carried through; v2 rejects/cleans invalid steps.
4. Aggregation: capture→discovery counts only when the opened card contains the captured item
   hash within the TTL window; each capture/discovery attributed at most once; denominators are
   non-expired capture / discovery event counts; latency arrays bounded.
5. E2E scripts extended for journey assertions (run if environment permits; otherwise recorded
   as not-run-here — parent owns final smoke).
6. Docs updated; no usefulness claims; synthetic planner receipts remain
   `synthetic-pure-planner-and-aggregation`.
