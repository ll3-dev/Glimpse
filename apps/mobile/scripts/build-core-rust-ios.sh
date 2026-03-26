#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/../.." && pwd)"
FRAMEWORK_DIR="$APP_DIR/ios/Frameworks"
HEADERS_DIR="$REPO_DIR/target/ios-headers"
SIM_UNIVERSAL_DIR="$REPO_DIR/target/universal-ios-sim"

mkdir -p "$FRAMEWORK_DIR" "$HEADERS_DIR" "$SIM_UNIVERSAL_DIR"

export RUSTC="${RUSTC:-$(rustup which rustc)}"

cat > "$HEADERS_DIR/glimpse_core.h" <<'EOF'
#pragma once
EOF

pushd "$REPO_DIR" >/dev/null
rustup run stable cargo build -p glimpse-core --release --target aarch64-apple-ios
rustup run stable cargo build -p glimpse-core --release --target aarch64-apple-ios-sim
rustup run stable cargo build -p glimpse-core --release --target x86_64-apple-ios

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
