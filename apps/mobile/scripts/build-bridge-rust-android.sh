#!/bin/zsh
# Builds packages/bridge-rust (glimpse-bridge) as Android staticlibs and stages
# them under android/glimpse-core/libs/<abi>/ next to the core-rust .so files,
# where the JSI module's CMake will pick them up.
#
# Toolchain/ABI set mirrors build-core-rust-android.sh. cargo-ndk's -o only
# stages shared libs, so the staticlibs are copied from target/ manually
# (same as the rustra example's build-rust-android.sh).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/../.." && pwd)"
OUTPUT_DIR="$APP_DIR/android/glimpse-core/libs"

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

pushd "$REPO_DIR" >/dev/null
rustup run stable cargo ndk \
  --platform 24 \
  -t armeabi-v7a \
  -t arm64-v8a \
  -t x86 \
  -t x86_64 \
  build -p glimpse-bridge --release

# Rust target triple -> Android ABI -> output dir (mirrors the rustra example).
copy_staticlib() {
  local target="$1"
  local abi="$2"
  mkdir -p "$OUTPUT_DIR/$abi"
  cp "target/$target/release/libglimpse_bridge.a" "$OUTPUT_DIR/$abi/libglimpse_bridge.a"
}

copy_staticlib armv7-linux-androideabi armeabi-v7a
copy_staticlib aarch64-linux-android arm64-v8a
copy_staticlib i686-linux-android x86
copy_staticlib x86_64-linux-android x86_64
popd >/dev/null

echo "==> Android bridge staticlibs staged in $OUTPUT_DIR/<abi>/libglimpse_bridge.a"
