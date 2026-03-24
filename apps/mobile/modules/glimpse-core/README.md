# @glimpse/mobile-core-module

Nitro-backed mobile Rust bridge.

Architecture:
- `packages/core-rs`: shared Rust business logic used by mobile and desktop.
- `apps/mobile/modules/glimpse-core`: app-local Nitro bridge package for mobile.
- `apps/desktop`: planned Tauri host that should call the same Rust core without React Native bridge code.

Current status:
- The React Native binding layer uses `react-native-nitro-modules`.
- The Rust core is still exposed through the existing CXX bridge headers and static libraries.
- Run `bun run --cwd apps/mobile/modules/glimpse-core typecheck` to validate the JS surface.
