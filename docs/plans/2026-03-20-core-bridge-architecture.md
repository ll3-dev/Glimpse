# Core Bridge Architecture

## Goal

Keep one Rust core and expose it to each host through a host-specific bridge:

- `packages/core-rs`: shared Rust domain logic
- `packages/mobile-core-module`: Craby-based React Native bridge for `apps/mobile`
- `apps/desktop`: Tauri shell that should link `packages/core-rs` directly

## Decision

Nitro-specific mobile bridge loading is removed from the app shell.

Reasons:
- The Nitro bridge was mobile-only and tightly coupled to generated `nitrogen` artifacts.
- Desktop work should not depend on React Native bridge conventions.
- Craby gives the mobile bridge a clearer boundary as a separate package.

## Short-Term State

- `apps/mobile` uses the SQLite/TypeScript core path only.
- `packages/mobile-core-module` is the new scaffold for mobile native codegen and Rust glue.
- `packages/core-rs` stays the shared source of Rust logic for both mobile and desktop.

## Next Steps

1. Install workspace dependencies so `crabygen` and `craby-modules` are available locally.
2. Run Craby codegen inside `packages/mobile-core-module`.
3. Implement the generated Craby trait methods by delegating to `packages/core-rs`.
4. Add `@glimpse/mobile-core-module` as a dependency of `apps/mobile` and switch `mobileCoreClient` to prefer it over the SQLite fallback.
5. Create the Tauri desktop crate and wire it directly to `packages/core-rs`.
