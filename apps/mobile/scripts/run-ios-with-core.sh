#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Build the rustra bridge staticlib (GlimpseBridge.xcframework), then run iOS.
"$SCRIPT_DIR/build-bridge-rust-ios.sh"

pushd "$APP_DIR" >/dev/null
bun run ios -- "$@"
popd >/dev/null
