# CI Recovery — 2026-09-06

## Context

`bun test` (CI `js` job) runs `chat-generation.test.ts` and `router.test.ts` in **one bun
process**. `chat-generation.test.ts` registered a process-global
`mock.module('./router', …)`; when it runs before `router.test.ts` (alphabetical order),
the router module registry is still mocked → `router.test.ts` fails (real router contract
tests receive mock responses). Additionally, a clean checkout is missing the PNG icons
declared in `tauri.conf.json` `bundle.icon` because `.gitignore` excludes all
`src-tauri/icons/*.png` except `icon.png` — `tauri build` would fail on a fresh clone.
`.loop/` (agent runtime dir) is also not ignored.

## Scope (non-deployment)

1. **Router DI in chat-generation** — `chat-generation.ts` gains an injectable
   `ChatRouterDeps` (default = real `./router` functions, additive 4th parameter).
   `chat-generation.test.ts` drops `mock.module('./router')` and injects mocks instead.
   **No assertion changes.** `router.ts` is NOT touched.
2. **Ordering regression guard** — new `router-module-isolation.test.ts` asserts the
   router module was never replaced (real-export shape + identity with chat-generation's
   default deps), plus `scripts/ai-router-ordering-check.sh` running the two test files in
   both orders in one process.
3. **Icons for clean checkout** — `.gitignore` exceptions for the three bundle-required
   PNGs (`32x32.png`, `128x128@2x.png`, `128x128.png` — files already exist locally,
   derived from the project icon). Non-manifest icons (`Square*`, `StoreLogo`, `64x64`)
   stay ignored. Plus `.loop/` ignore.
4. **Resource manifest guard** — new `apps/desktop/src/tauri-bundle-resources.test.ts`
   asserts every `bundle.icon` entry exists and is not gitignored.

## Non-goals

No router.ts changes, no full builds, no deployment/CI config changes, no commits/staging.
Mobile and graph areas untouched (owned by other workers).

## Validation

- `scripts/ai-router-ordering-check.sh` (both orders) — must be green.
- `bun test apps/desktop/src/features/ai` full-directory run.
- `git check-ignore` clean for declared bundle icons.
- `bun run desktop:typecheck`, `bun run desktop:lint`.

## Limitations

The required icon PNGs exist locally and become addable after the `.gitignore` fix, but
staging/committing is out of scope — until committed, a fresh clone still lacks them.

## Results (actual)

- `scripts/ai-router-ordering-check.sh`: both orders green (14 pass each).
- `bun test apps/desktop/src/features/ai apps/desktop/src/tauri-bundle-resources.test.ts`:
  39 pass / 0 fail (includes 2 new isolation tests + 3 manifest guard tests).
- Manifest guard negative probe verified: removing a `!` exception from `.gitignore`
  turns the guard red.
- `git check-ignore` (manual, shell): declared icons exit 1 = none ignored; the three
  bundle PNGs show as untracked (`??`) — present, addable.
- Scoped eslint on the 5 touched AI/test files: clean. `tsc --noEmit`: no errors in any
  touched file.
- Pre-existing/concurrent failures NOT from this change (graph area, other workers):
  `packages/features/src/graph/local-metrics.ts` tsc error and
  `graph-metrics.store.test.ts` lint error.
- Finding: bun 1.4.0 locally did not reproduce the cross-file `mock.module` leak (synthetic
  probe: a mocked module in file A stays real for file B's fresh dynamic import). The DI
  change removes the fragile pattern regardless; the driver + isolation test guard both
  orders and module identity.
- `git check-ignore` could not be spawned inside `bun test` (EBADF posix_spawn, bun 1.4.0
  runtime quirk) — the manifest guard evaluates `.gitignore` rules in pure JS instead.
- `chat-generation.ts`: 156 → 184 lines (single responsibility retained; no split needed).
