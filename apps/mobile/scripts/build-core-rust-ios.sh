#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/../.." && pwd)"
FRAMEWORK_DIR="$APP_DIR/ios/Frameworks"
HEADERS_DIR="$REPO_DIR/target/ios-headers"
SIM_UNIVERSAL_DIR="$REPO_DIR/target/universal-ios-sim"
GENERATED_HEADER="$APP_DIR/cpp/generated/glimpse_core.h"
IOS_MIN_VERSION="${IOS_MIN_VERSION:-15.1}"

mkdir -p "$FRAMEWORK_DIR" "$HEADERS_DIR" "$SIM_UNIVERSAL_DIR"

export RUSTC="${RUSTC:-$(rustup which rustc)}"
"$APP_DIR/scripts/generate-core-rust-ffi-header.sh"
cp "$GENERATED_HEADER" "$HEADERS_DIR/glimpse_core.h"

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
    rustup run stable cargo build -p glimpse-core --release --target "$target"
}

pushd "$REPO_DIR" >/dev/null
rm -rf target/aarch64-apple-ios/release/build target/aarch64-apple-ios-sim/release/build target/x86_64-apple-ios/release/build

build_ios_target aarch64-apple-ios iphoneos "-miphoneos-version-min=$IOS_MIN_VERSION"
build_ios_target aarch64-apple-ios-sim iphonesimulator "-mios-simulator-version-min=$IOS_MIN_VERSION"
build_ios_target x86_64-apple-ios iphonesimulator "-mios-simulator-version-min=$IOS_MIN_VERSION"

lipo -create \
  target/aarch64-apple-ios-sim/release/libglimpse_core.a \
  target/x86_64-apple-ios/release/libglimpse_core.a \
  -output "$SIM_UNIVERSAL_DIR/libglimpse_core.a"

rm -rf "$FRAMEWORK_DIR/GlimpseCore.xcframework"
xcodebuild -create-xcframework \
  -library target/aarch64-apple-ios/release/libglimpse_core.a -headers "$HEADERS_DIR" \
  -library "$SIM_UNIVERSAL_DIR/libglimpse_core.a" -headers "$HEADERS_DIR" \
  -output "$FRAMEWORK_DIR/GlimpseCore.xcframework"
popd >/dev/null
