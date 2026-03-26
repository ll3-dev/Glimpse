#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/../.." && pwd)"
OUTPUT_DIR="$APP_DIR/android/glimpse-core/libs"
GENERATED_HEADER="$APP_DIR/cpp/generated/glimpse_core.h"

mkdir -p "$OUTPUT_DIR"

DEFAULT_ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"

if [ -d "$DEFAULT_ANDROID_SDK_ROOT" ]; then
  export ANDROID_HOME="$DEFAULT_ANDROID_SDK_ROOT"
  export ANDROID_SDK_ROOT="$DEFAULT_ANDROID_SDK_ROOT"
else
  export ANDROID_HOME="${ANDROID_HOME:-$DEFAULT_ANDROID_SDK_ROOT}"
  export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
fi

export ANDROID_NDK_HOME="$ANDROID_SDK_ROOT/ndk/27.1.12297006"
export RUSTC="${RUSTC:-$(rustup which rustc)}"

"$APP_DIR/scripts/generate-core-rust-ffi-header.sh"
[ -f "$GENERATED_HEADER" ]

pushd "$REPO_DIR" >/dev/null
rustup run stable cargo ndk \
  --platform 24 \
  -t armeabi-v7a \
  -t arm64-v8a \
  -t x86 \
  -t x86_64 \
  -o "$OUTPUT_DIR" \
  build -p glimpse-core --release
popd >/dev/null
