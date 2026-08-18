# Rustra Bridge Development Guide

> The typed Nitro bridge this directory used to document was removed in the
> week-2 rustra migration (see
> [integration design](/Users/loopy/dev/ll3/Glimpse/docs/plans/2026-08-16-rustra-integration-design.md)).
> The domain CoreClient now runs on the shared rustra bridge — the same
> `@glimpse/bridge-generated` client the desktop app uses. This guide covers
> the mobile-specific pieces.

This document describes how the mobile app talks to the Rust core and how to
change that surface.

## Architecture

```
TS CoreClient adapter (src/features/core/rustra-core-client.ts)
  └─ @glimpse/bridge-generated (packages/bridge-rust/generated/)
       └─ global rustra engine (configure() at bootstrap)
            └─ rustra-jsi module (modules/rustra-jsi/) — JSI HostObject
                 └─ rustra_ffi_invoke_json (packages/bridge-rust staticlib)
                      └─ glimpse.core package (26 rustra commands)
                           └─ glimpse-core SharedCore (single SQLite connection)
```

Platform rule of thumb:

- shared domain/use-case logic belongs in `packages/core-rust`
- transport belongs in `packages/bridge-rust` (rustra `#[command]`s) — desktop
  and mobile share it verbatim
- app-specific filtering or view-model shaping stays in platform application
  layers (`src/features/core/application/`)

Key files:

1. rustra commands + IO structs
   [`packages/bridge-rust/src/`](/Users/loopy/dev/ll3/Glimpse/packages/bridge-rust/src/)
   (LLM stream and model download events live in `src/events.rs` — `emit_llm_token`,
   `emit_llm_done`, `emit_model_download_progress`, `emit_model_download_done`
   push through the rustra event sink; desktop listens on `rustra://` prefixed channels.
   Mobile streaming is connected via `stream-events.ts` and `subscribeEvent`.)
2. generated TS client (checked in)
   [`packages/bridge-rust/generated/`](/Users/loopy/dev/ll3/Glimpse/packages/bridge-rust/generated/)
3. JSI native module (iOS `.mm` + C++ HostObject, Android JNI + Kotlin)
   [`apps/mobile/modules/rustra-jsi/`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/modules/rustra-jsi/)
4. engine bootstrap + JSON engine (Hermes has no `TextDecoder`)
   [`apps/mobile/src/features/core/rustra-engine.native.ts`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/src/features/core/rustra-engine.native.ts)
   [`apps/mobile/src/features/core/rustra-json-engine.ts`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/src/features/core/rustra-json-engine.ts)
5. CoreClient adapter (envelope unwrapping, enum narrowing)
   [`apps/mobile/src/features/core/rustra-core-client.ts`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/src/features/core/rustra-core-client.ts)

## When You Change Rust

1. Add or change the `#[command]` and IO structs in `packages/bridge-rust/src/`.
   Wire commands into `register_commands` of their domain module; new domains
   also need a `.pipe(<domain>::register_commands)` in `glimpse_package()`.
2. Regenerate the TS client from the repo root:

   ```sh
   bun run bridge:generate
   ```

3. Rebuild the mobile staticlibs (below) and commit the regenerated
   `packages/bridge-rust/generated/` alongside the Rust change.

The mobile `initialize` maps to the `initializeCore` command — it opens the
DB at the given path inside the bridge global, so exactly one SQLite
connection exists per process (the Tauri desktop host does the equivalent in
its setup hook instead).

## Rules

- Do not add platform-specific domain commands — mobile and desktop share the
  `glimpse.core` package; anything app-specific belongs in JS application code.
- Wire structs rename to camelCase (`#[serde(rename_all = "camelCase")]`) so
  the TS side needs no key conversion.
- Enums cross the wire as plain strings; the TS adapter narrows them back to
  the shared string-literal unions.
- Treat patch payloads as tristate (`Option<serde_json::Value>`): absent,
  explicit null, value.

## Rebuild Native Artifacts

### iOS

```sh
bun run --cwd apps/mobile build:bridge:ios
```

Refreshes `apps/mobile/ios/Frameworks/GlimpseBridge.xcframework`, which the
`RustraJSI` pod force-links into the app target. Skipping this step fails at
link time with missing `rustra_ffi_*` symbols.

### Android

```sh
bun run --cwd apps/mobile build:bridge:android
```

Stages `libglimpse_bridge.a` per ABI under the rustrajsi module's CMake
import path.

## Validation Checklist

- `bun run --cwd apps/mobile typecheck`
- `bun run lint` (repo root)
- `cargo test -p glimpse-bridge -p glimpse-desktop`
- `bun run --cwd apps/mobile test`
- iOS smoke: `bun run --cwd apps/mobile ios:core`

## Common Failure Modes

- **`RustraJSI native module not found`** — native build stale or running in
  Expo Go; the CoreClient falls back to the in-memory client (data does not
  persist in that state).
- **Missing `rustra_ffi_*` symbols at link** — rebuild the bridge xcframework.
- **`glimpse-bridge core state not initialized`** — a command dispatched
  before `initializeCore`; startup must await `initializeCoreClient()` (the
  root layout already does).
