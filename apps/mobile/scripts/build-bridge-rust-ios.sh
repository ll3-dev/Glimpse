#!/bin/zsh
# Builds packages/bridge-rust (glimpse-bridge) as an iOS staticlib and packs it
# into GlimpseBridge.xcframework next to GlimpseCore.xcframework.
#
# Toolchain/targets mirror build-core-rust-ios.sh. No headers are shipped: the
# JSI bridge declares the rustra_ffi_* externs itself (see the rustra example's
# RustraJSIBridge.hpp).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/../.." && pwd)"
FRAMEWORK_DIR="$APP_DIR/ios/Frameworks"
SIM_UNIVERSAL_DIR="$REPO_DIR/target/universal-ios-sim-bridge"
IOS_MIN_VERSION="${IOS_MIN_VERSION:-15.1}"

mkdir -p "$FRAMEWORK_DIR" "$SIM_UNIVERSAL_DIR"

export RUSTC="${RUSTC:-$(rustup which rustc)}"

build_ios_target() {
  local target="$1"
  local sdk="$2"
  local min_flag="$3"

  local sdk_path
  sdk_path="$(xcrun --sdk "$sdk" --show-sdk-path)"

  local cflags_var="CFLAGS_${target//-/_}"
  local cxxflags_var="CXXFLAGS_${target//-/_}"
  local rustflags_var="RUSTFLAGS"

  env \
    IPHONEOS_DEPLOYMENT_TARGET="$IOS_MIN_VERSION" \
    SDKROOT="$sdk_path" \
    "$cflags_var=$min_flag" \
    "$cxxflags_var=$min_flag" \
    "$rustflags_var=-C link-arg=$min_flag" \
    rustup run stable cargo build -p glimpse-bridge --lib --release --target "$target"
}

pushd "$REPO_DIR" >/dev/null
rm -rf target/aarch64-apple-ios/release/build target/aarch64-apple-ios-sim/release/build target/x86_64-apple-ios/release/build

build_ios_target aarch64-apple-ios iphoneos "-miphoneos-version-min=$IOS_MIN_VERSION"
build_ios_target aarch64-apple-ios-sim iphonesimulator "-mios-simulator-version-min=$IOS_MIN_VERSION"
build_ios_target x86_64-apple-ios iphonesimulator "-mios-simulator-version-min=$IOS_MIN_VERSION"

lipo -create \
  target/aarch64-apple-ios-sim/release/libglimpse_bridge.a \
  target/x86_64-apple-ios/release/libglimpse_bridge.a \
  -output "$SIM_UNIVERSAL_DIR/libglimpse_bridge.a"

rm -rf "$FRAMEWORK_DIR/GlimpseBridge.xcframework"
xcodebuild -create-xcframework \
  -library target/aarch64-apple-ios/release/libglimpse_bridge.a \
  -library "$SIM_UNIVERSAL_DIR/libglimpse_bridge.a" \
  -output "$FRAMEWORK_DIR/GlimpseBridge.xcframework"
popd >/dev/null
