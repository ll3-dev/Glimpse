# @glimpse/mobile-core-module

Craby scaffold for the mobile Rust bridge.

Architecture:
- `packages/core-rs`: shared Rust business logic used by mobile and desktop.
- `packages/mobile-core-module`: React Native bridge package for mobile via Craby.
- `apps/desktop`: planned Tauri host that should call the same Rust core without React Native bridge code.

Current status:
- Nitro bridge loading has been removed from `apps/mobile`.
- The app currently falls back to the SQLite/TypeScript implementation.
- This package is the new home for the mobile native bridge and should be completed by running `bun install` and `bun run --cwd packages/mobile-core-module codegen`.
