#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/../.." && pwd)"
CRATE_DIR="$REPO_DIR/packages/core-rust"
OUTPUT_DIR="$APP_DIR/cpp/generated"
OUTPUT_FILE="$OUTPUT_DIR/glimpse_core.h"
SOURCE_FILE="$CRATE_DIR/src/ffi/mod.rs"
TMP_FILE="$OUTPUT_DIR/.glimpse_core.h.tmp"

mkdir -p "$OUTPUT_DIR"

if ! command -v cbindgen >/dev/null 2>&1; then
  echo "cbindgen is required to generate $OUTPUT_FILE" >&2
  echo "Install it with: cargo install cbindgen" >&2
  exit 1
fi

cbindgen "$SOURCE_FILE" --config "$CRATE_DIR/cbindgen.toml" --lang c++ --output "$TMP_FILE"
{
  echo "#pragma once"
  echo
  echo "struct SharedCore;"
  echo
  cat "$TMP_FILE"
} > "$OUTPUT_FILE"
rm -f "$TMP_FILE"
