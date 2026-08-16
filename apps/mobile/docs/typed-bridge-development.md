# Typed Bridge Development Guide

> **Note (2026-08-16):** This Nitro bridge is scheduled for replacement by
> [rustra](/Users/loopy/dev/ll3/Glimpse/docs/plans/2026-08-16-rustra-integration-design.md)
> (week 2 of the migration). The desktop app has already migrated; mobile
> switches after the RN JSI adapter is ported. Until then this guide remains
> the source of truth for the mobile FFI surface.

This document describes how to add or change Rust-backed APIs in the typed Nitro bridge.

## Architecture

The bridge is split into these layers:

Platform rule of thumb:

- shared domain/use-case logic belongs in `packages/core-rust`
- React Native Nitro and Tauri commands should stay thin transport adapters
- app-specific filtering or view-model shaping should stay in platform application/query layers

1. TypeScript Nitro spec
   [`apps/mobile/generate/CoreClient.nitro.ts`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/generate/CoreClient.nitro.ts)
2. Generated Nitro C++ structs/spec
   [`apps/mobile/nitrogen/generated/shared/c++`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/nitrogen/generated/shared/c++)
3. Handwritten C++ shim and FFI adapters
   [`apps/mobile/cpp/HybridCoreClient.hpp`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/cpp/HybridCoreClient.hpp)
   [`apps/mobile/cpp/GlimpseCoreFfi.hpp`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/cpp/GlimpseCoreFfi.hpp)
4. Generated Rust FFI header
   [`apps/mobile/cpp/generated/glimpse_core.h`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/cpp/generated/glimpse_core.h)
5. Rust FFI transport and typed entrypoints
   [`packages/core-rust/src/ffi/types.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/ffi/types.rs)
   [`packages/core-rust/src/ffi/typed_ops.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/ffi/typed_ops.rs)
6. Rust domain and storage
   [`packages/core-rust/src/models.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/models.rs)
   [`packages/core-rust/src/core_client`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/core_client)
   [`packages/core-rust/src/storage/sqlite`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/storage/sqlite)

The data flow is:

`TS interface -> Nitrogen generated C++ types -> handwritten C++ adapter -> Rust #[repr(C)] FFI -> Rust domain`

For shared desktop/mobile work, prefer:

`Platform adapter -> shared Rust application entrypoint -> storage/domain`

before adding any new platform-specific transport surface.

## When You Change Rust

Most Rust-side bridge changes touch these files:

1. Domain model and behavior
   [`packages/core-rust/src/models.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/models.rs)
   [`packages/core-rust/src/core_client`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/core_client)
   [`packages/core-rust/src/storage/sqlite`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/storage/sqlite)
2. FFI-safe transport structs
   [`packages/core-rust/src/ffi/types.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/ffi/types.rs)
3. FFI conversion and exported functions
   [`packages/core-rust/src/ffi/typed_ops.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/ffi/typed_ops.rs)
4. FFI module exports
   [`packages/core-rust/src/ffi/mod.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/ffi/mod.rs)
5. cbindgen export list
   [`packages/core-rust/cbindgen.toml`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/cbindgen.toml)

## Rules

- Do not expose Rust domain structs directly over C ABI.
- Add `#[repr(C)]` FFI transport types for every new bridge struct.
- If Rust allocates strings or arrays for C++, add a matching free function.
- Treat patch payloads as explicit transport objects with presence fields.
- Use `i64` for timestamps and integer values.
- Use `f64` for decimal values such as scores and scheduling metrics.
- Keep C++ ownership rules simple: Rust allocates return values, C++ frees them with the exported `ffi_*_free` function.

## Adding A New Entity Or API

### 1. Add or change domain logic in Rust

Update:

- [`packages/core-rust/src/models.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/models.rs)
- [`packages/core-rust/src/core_client`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/core_client)
- [`packages/core-rust/src/storage/sqlite`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/storage/sqlite)

### 2. Add FFI transport types

Update [`packages/core-rust/src/ffi/types.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/ffi/types.rs).

Typical additions:

- `FfiMyEntity`
- `FfiMyEntityArray`
- `FfiMyEntityPatch`
- optional wrappers if needed

### 3. Add typed FFI entrypoints

Update [`packages/core-rust/src/ffi/typed_ops.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/ffi/typed_ops.rs).

Typical additions:

- `ffi_to_my_entity(...)`
- `my_entity_to_ffi(...)`
- `core_client_create_my_entity_typed(...)`
- `core_client_list_my_entities_typed(...)`
- `core_client_update_my_entity_typed(...)`
- `ffi_my_entity_free(...)`
- `ffi_my_entity_array_free(...)`

### 4. Export through the FFI module

Update [`packages/core-rust/src/ffi/mod.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/ffi/mod.rs) if you add new modules or new public exports.

### 5. Export through cbindgen

Update [`packages/core-rust/cbindgen.toml`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/cbindgen.toml).

Add new types/functions to `export.include`, otherwise the generated header will not contain them.

### 6. Regenerate the C++ header

Run:

```sh
zsh ./apps/mobile/scripts/generate-core-rust-ffi-header.sh
```

This generates:

- [`apps/mobile/cpp/generated/glimpse_core.h`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/cpp/generated/glimpse_core.h)

## When You Change The Bridge Surface

If the JS-visible API changes, update these too:

1. Nitro spec
   [`apps/mobile/generate/CoreClient.nitro.ts`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/generate/CoreClient.nitro.ts)
2. Regenerate Nitro outputs

```sh
cd apps/mobile
node node_modules/nitrogen/lib/index.js .
```

3. C++ FFI helpers
   [`apps/mobile/cpp/GlimpseCoreFfi.hpp`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/cpp/GlimpseCoreFfi.hpp)
4. C++ shim methods
   [`apps/mobile/cpp/HybridCoreClient.hpp`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/cpp/HybridCoreClient.hpp)
5. JS adapter
   [`apps/mobile/src/features/core/native-core-client.native.ts`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/src/features/core/native-core-client.native.ts)

## Rebuild Native Artifacts

### iOS

Rebuild the Rust xcframework after Rust FFI changes:

```sh
zsh ./apps/mobile/scripts/build-core-rust-ios.sh
```

This refreshes:

- [`apps/mobile/ios/Frameworks/GlimpseCore.xcframework`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/ios/Frameworks/GlimpseCore.xcframework)

If you skip this step, iOS will usually fail at link time with missing typed FFI symbols.

### Android

Rebuild the Android Rust library when needed:

```sh
zsh ./apps/mobile/scripts/build-core-rust-android.sh
```

## Validation Checklist

Run these after bridge changes:

```sh
cargo check -p glimpse-core
cd apps/mobile && bun run typecheck
cd apps/mobile && bun test ./src/features/core/native-core-client.native.test.ts
cd apps/mobile && bun run lint
cd apps/mobile/ios && xcodebuild -workspace glimpse.xcworkspace -scheme glimpse -configuration Debug -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO build
```

For Rust FFI changes that affect native linking, also run:

```sh
zsh ./apps/mobile/scripts/build-core-rust-ios.sh
```

## Common Failure Modes

### Header generated, but C++ cannot call the function

Usually one of:

- the function is not exported from [`typed_ops.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/ffi/typed_ops.rs)
- the symbol is missing from [`cbindgen.toml`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/cbindgen.toml)
- the header was not regenerated

### iOS build fails with undefined typed symbols

Usually the Rust xcframework is stale. Re-run:

```sh
zsh ./apps/mobile/scripts/build-core-rust-ios.sh
```

### Pod umbrella cannot find `HybridCoreClient.hpp`

Nitrogen-generated iOS autolinking expects:

- [`apps/mobile/nitrogen/generated/shared/c++/HybridCoreClient.hpp`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/nitrogen/generated/shared/c++/HybridCoreClient.hpp)

That file currently forwards to the handwritten shim in:

- [`apps/mobile/cpp/HybridCoreClient.hpp`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/cpp/HybridCoreClient.hpp)

Do not remove the forwarding header unless the pod/header wiring changes too.

### Nullable patch behavior is confusing

Patch transport uses explicit presence fields:

- `hasValue = false`: field not provided
- `hasValue = true` and `isNull = true`: explicit null
- `hasValue = true` and `isNull = false`: concrete value

Keep that contract aligned across:

- Nitro patch interfaces
- C++ conversion helpers
- Rust FFI patch structs

## Practical Workflow

For most bridge work, this sequence is enough:

1. Change Rust domain code.
2. Change [`ffi/types.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/ffi/types.rs) and [`ffi/typed_ops.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/ffi/typed_ops.rs).
3. Update [`cbindgen.toml`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/cbindgen.toml).
4. Run `zsh ./apps/mobile/scripts/generate-core-rust-ffi-header.sh`.
5. If the JS API changed, update Nitro spec and regenerate Nitrogen outputs.
6. Update [`GlimpseCoreFfi.hpp`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/cpp/GlimpseCoreFfi.hpp) and [`HybridCoreClient.hpp`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/cpp/HybridCoreClient.hpp).
7. Rebuild the iOS Rust xcframework.
8. Run validation.

## Fast iOS Loop

When Rust changes need to show up in iOS immediately, use one of these commands from
[`apps/mobile`](/Users/loopy/dev/ll3/Glimpse/apps/mobile):

```sh
bun run build:core:ios
```

This regenerates the C++ header and rebuilds
[`ios/Frameworks/GlimpseCore.xcframework`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/ios/Frameworks/GlimpseCore.xcframework).

To rebuild Rust first and then launch iOS in one step:

```sh
bun run ios:core
```

To rebuild Rust first and then install on a connected device:

```sh
bun run ios:device:core
```

Or pass an explicit device name:

```sh
bun run ios:core -- --device "My iPhone"
```

The wrapper command is implemented in
[`scripts/run-ios-with-core.sh`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/scripts/run-ios-with-core.sh),
so Rust bridge updates are always compiled before `expo run:ios` starts.
