#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODULE_DIR="$ROOT_DIR/apps/mobile/modules/glimpse-core"
WORKSPACE_MANIFEST="$ROOT_DIR/Cargo.toml"
GENERATED_DIR="$MODULE_DIR/target/cxxbridge/glimpsecore/src"

echo "Generating glimpse-core CXX bridge artifacts..."
cargo check \
  --manifest-path "$WORKSPACE_MANIFEST" \
  --locked \
  --offline \
  --package glimpsecore

if [[ ! -f "$GENERATED_DIR/ffi.rs.h" || ! -f "$GENERATED_DIR/ffi.rs.cc" ]]; then
  echo "Expected generated bridge files were not found in $GENERATED_DIR" >&2
  exit 1
fi

cp "$GENERATED_DIR/ffi.rs.h" "$MODULE_DIR/ios/include/ffi.rs.h"
cp "$GENERATED_DIR/ffi.rs.cc" "$MODULE_DIR/ios/src/ffi.rs.cc"
cp "$GENERATED_DIR/ffi.rs.h" "$MODULE_DIR/android/src/main/jni/include/ffi.rs.h"
cp "$GENERATED_DIR/ffi.rs.cc" "$MODULE_DIR/android/src/main/jni/src/ffi.rs.cc"

normalize_bridge_file() {
  local file="$1"
  python3 - "$file" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
replacements = [
    ("namespace craby {", "namespace ll3 {"),
    ("namespace glimpsecore {", "namespace glimpse {"),
    ("} // namespace glimpsecore", "} // namespace glimpse"),
    ("} // namespace craby", "} // namespace ll3"),
    ("craby::glimpsecore::bridging", "ll3::glimpse::bridging"),
    ("craby$glimpsecore$bridging", "ll3$glimpse$bridging"),
]
for old, new in replacements:
    text = text.replace(old, new)
path.write_text(text)
PY
}

normalize_bridge_file "$MODULE_DIR/ios/include/ffi.rs.h"
normalize_bridge_file "$MODULE_DIR/ios/src/ffi.rs.cc"
normalize_bridge_file "$MODULE_DIR/android/src/main/jni/include/ffi.rs.h"
normalize_bridge_file "$MODULE_DIR/android/src/main/jni/src/ffi.rs.cc"

echo "Updated iOS and Android bridge artifacts from $GENERATED_DIR."
