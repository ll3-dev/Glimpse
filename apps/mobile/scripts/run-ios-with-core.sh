#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

"$SCRIPT_DIR/build-core-rust-ios.sh"

pushd "$APP_DIR" >/dev/null
bun run ios -- "$@"
popd >/dev/null
