# @glimpse/mobile-core-module

Nitro-backed mobile Rust bridge.

Architecture:
- `packages/core-rs`: shared Rust business logic used by mobile and desktop.
- `apps/mobile/modules/glimpse-core`: app-local Nitro bridge package for mobile.
- `apps/desktop`: planned Tauri host that should call the same Rust core without React Native bridge code.

Current status:
- The React Native binding layer uses `react-native-nitro-modules`.
- The Rust core is exposed through a handwritten `cxx::bridge` layer plus platform static libraries.
- Run `bun run --cwd apps/mobile/modules/glimpse-core codegen` to regenerate checked-in `ffi.rs.h/.cc` bridge artifacts and validate the JS surface.
- Run `bun run mobile:bridge:prebuilt:ios` or `bun run mobile:bridge:prebuilt:android` to refresh the packaged release archives consumed by Xcode and CMake.
