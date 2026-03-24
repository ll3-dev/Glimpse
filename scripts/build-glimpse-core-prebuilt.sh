#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODULE_DIR="$ROOT_DIR/apps/mobile/modules/glimpse-core"
WORKSPACE_MANIFEST="$MODULE_DIR/Cargo.toml"
TARGET_DIR="$MODULE_DIR/target"
CARGO_BIN="$(rustup which cargo)"
RUSTC_BIN="$(rustup which rustc)"

PLATFORM="${1:-all}"

IOS_DEVICE_TARGET="aarch64-apple-ios"
IOS_SIM_ARM_TARGET="aarch64-apple-ios-sim"
IOS_SIM_X64_TARGET="x86_64-apple-ios"

ANDROID_TARGETS=(
  "aarch64-linux-android:arm64-v8a"
  "armv7-linux-androideabi:armeabi-v7a"
  "i686-linux-android:x86"
  "x86_64-linux-android:x86_64"
)

ndk_host_tag() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Darwin)
      case "$arch" in
        arm64) echo "darwin-arm64" ;;
        x86_64) echo "darwin-x86_64" ;;
        *) return 1 ;;
      esac
      ;;
    Linux)
      case "$arch" in
        x86_64) echo "linux-x86_64" ;;
        *) return 1 ;;
      esac
      ;;
    *)
      return 1
      ;;
  esac
}

resolve_ndk_toolchain_bin() {
  local ndk_root="$1"
  local preferred fallback

  preferred="$ndk_root/toolchains/llvm/prebuilt/$(ndk_host_tag)/bin"
  if [[ -d "$preferred" ]]; then
    echo "$preferred"
    return 0
  fi

  fallback="$(find "$ndk_root/toolchains/llvm/prebuilt" -maxdepth 2 -mindepth 2 -type d -name bin | head -n 1)"
  if [[ -n "$fallback" ]]; then
    echo "$fallback"
    return 0
  fi

  return 1
}

find_android_ndk_root() {
  local -a candidates=()
  local sdk_root=""

  if [[ -n "${ANDROID_NDK_ROOT:-}" ]]; then
    candidates+=("${ANDROID_NDK_ROOT}")
  fi
  if [[ -n "${NDK_HOME:-}" ]]; then
    candidates+=("${NDK_HOME}")
  fi

  if [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then
    sdk_root="${ANDROID_SDK_ROOT}"
  elif [[ -n "${ANDROID_HOME:-}" ]]; then
    sdk_root="${ANDROID_HOME}"
  elif [[ -d "$HOME/Library/Android/sdk" ]]; then
    sdk_root="$HOME/Library/Android/sdk"
  elif [[ -d "$HOME/Android/Sdk" ]]; then
    sdk_root="$HOME/Android/Sdk"
  fi

  if [[ -n "$sdk_root" && ! -d "$sdk_root/ndk" && -d "$sdk_root/sdk/ndk" ]]; then
    sdk_root="$sdk_root/sdk"
  fi

  if [[ -n "$sdk_root" ]]; then
    if [[ -d "$sdk_root/ndk" ]]; then
      local latest
      latest="$(ls -1 "$sdk_root/ndk" | sort -V | tail -n 1)"
      if [[ -n "$latest" ]]; then
        candidates+=("$sdk_root/ndk/$latest")
      fi
    fi
    if [[ -d "$sdk_root/ndk-bundle" ]]; then
      candidates+=("$sdk_root/ndk-bundle")
    fi
  fi

  local candidate
  if (( ${#candidates[@]} > 0 )); then
    for candidate in "${candidates[@]}"; do
      if resolve_ndk_toolchain_bin "$candidate" >/dev/null; then
        echo "$candidate"
        return 0
      fi
    done
  fi

  echo "Unable to locate Android NDK root." >&2
  if [[ -n "$sdk_root" ]]; then
    echo "Checked SDK root: $sdk_root" >&2
  else
    echo "ANDROID_SDK_ROOT/ANDROID_HOME were not set to a usable SDK directory." >&2
  fi
  if (( ${#candidates[@]} > 0 )); then
    echo "Checked candidates:" >&2
    printf '  %s\n' "${candidates[@]}" >&2
  else
    echo "No NDK candidates were discovered." >&2
  fi
  return 1
}

require_rust_target() {
  local target="$1"

  if ! rustup target list --installed | rg -qx "$target"; then
    echo "Missing Rust target: $target" >&2
    echo "Install it with: rustup target add $target" >&2
    exit 1
  fi
}

build_target() {
  local target="$1"
  require_rust_target "$target"

  case "$target" in
    "$IOS_DEVICE_TARGET")
      env \
        IPHONEOS_DEPLOYMENT_TARGET=15.1 \
        CFLAGS_aarch64_apple_ios="-miphoneos-version-min=15.1" \
        CXXFLAGS_aarch64_apple_ios="-miphoneos-version-min=15.1" \
        "$CARGO_BIN" build \
          --config "build.rustc=\"$RUSTC_BIN\"" \
          --manifest-path "$WORKSPACE_MANIFEST" \
          --locked \
          --release \
          --target "$target" \
          --package glimpsecore
      ;;
    "$IOS_SIM_ARM_TARGET"|"$IOS_SIM_X64_TARGET")
      env \
        IPHONEOS_DEPLOYMENT_TARGET=15.1 \
        CFLAGS_aarch64_apple_ios_sim="-mios-simulator-version-min=15.1" \
        CXXFLAGS_aarch64_apple_ios_sim="-mios-simulator-version-min=15.1" \
        CFLAGS_x86_64_apple_ios="-mios-simulator-version-min=15.1" \
        CXXFLAGS_x86_64_apple_ios="-mios-simulator-version-min=15.1" \
        "$CARGO_BIN" build \
          --config "build.rustc=\"$RUSTC_BIN\"" \
          --manifest-path "$WORKSPACE_MANIFEST" \
          --locked \
          --release \
          --target "$target" \
          --package glimpsecore
      ;;
    *)
      "$CARGO_BIN" build \
        --config "build.rustc=\"$RUSTC_BIN\"" \
        --manifest-path "$WORKSPACE_MANIFEST" \
        --locked \
        --release \
        --target "$target" \
        --package glimpsecore
      ;;
  esac
}

build_android_target() {
  local target="$1"
  local ndk_root toolchain_bin api clang_target env_key cargo_target_key

  require_rust_target "$target"

  ndk_root="$(find_android_ndk_root)"
  toolchain_bin="$(resolve_ndk_toolchain_bin "$ndk_root")"

  case "$target" in
    aarch64-linux-android)
      api=24
      clang_target="aarch64-linux-android"
      ;;
    armv7-linux-androideabi)
      api=24
      clang_target="armv7a-linux-androideabi"
      ;;
    i686-linux-android)
      api=24
      clang_target="i686-linux-android"
      ;;
    x86_64-linux-android)
      api=24
      clang_target="x86_64-linux-android"
      ;;
    *)
      echo "Unsupported Android target: $target" >&2
      exit 1
      ;;
  esac

  env_key="${target//-/_}"
  cargo_target_key="$(printf '%s' "$env_key" | tr '[:lower:]' '[:upper:]')"

  env \
    RUSTC="$RUSTC_BIN" \
    CC_${env_key}="$toolchain_bin/${clang_target}${api}-clang" \
    CXX_${env_key}="$toolchain_bin/${clang_target}${api}-clang++" \
    AR_${env_key}="$toolchain_bin/llvm-ar" \
    CARGO_TARGET_${cargo_target_key}_LINKER="$toolchain_bin/${clang_target}${api}-clang" \
    "$CARGO_BIN" build \
      --config "build.rustc=\"$RUSTC_BIN\"" \
      --manifest-path "$WORKSPACE_MANIFEST" \
      --locked \
      --release \
      --target "$target" \
      --package glimpsecore
}

build_ios_prebuilt() {
  local out_dir="$MODULE_DIR/ios/framework"
  local xcframework="$out_dir/libglimpsecore.xcframework"
  local tmp_dir
  local device_dir
  local sim_dir
  tmp_dir="$(mktemp -d)"
  device_dir="$tmp_dir/device"
  sim_dir="$tmp_dir/sim"
  mkdir -p "$device_dir" "$sim_dir"

  build_target "$IOS_DEVICE_TARGET"
  build_target "$IOS_SIM_ARM_TARGET"
  build_target "$IOS_SIM_X64_TARGET"

  cp "$TARGET_DIR/$IOS_DEVICE_TARGET/release/libglimpsecore.a" \
    "$device_dir/libglimpsecore-prebuilt.a"

  lipo -create \
    "$TARGET_DIR/$IOS_SIM_ARM_TARGET/release/libglimpsecore.a" \
    "$TARGET_DIR/$IOS_SIM_X64_TARGET/release/libglimpsecore.a" \
    -output "$sim_dir/libglimpsecore-prebuilt.a"

  rm -rf "$xcframework"
  xcodebuild -create-xcframework \
    -library "$device_dir/libglimpsecore-prebuilt.a" \
    -library "$sim_dir/libglimpsecore-prebuilt.a" \
    -output "$xcframework" >/tmp/glimpse-core-create-xcframework.log 2>&1

  rm -rf "$tmp_dir"
}

build_android_prebuilt() {
  local entry target abi

  for entry in "${ANDROID_TARGETS[@]}"; do
    target="${entry%%:*}"
    abi="${entry##*:}"
    build_android_target "$target"
    cp \
      "$TARGET_DIR/$target/release/libglimpsecore.a" \
      "$MODULE_DIR/android/src/main/jni/libs/$abi/libglimpsecore-prebuilt.a"
  done
}

case "$PLATFORM" in
  ios)
    build_ios_prebuilt
    ;;
  android)
    build_android_prebuilt
    ;;
  both|all)
    build_ios_prebuilt
    build_android_prebuilt
    ;;
  *)
    echo "Unknown platform: $PLATFORM" >&2
    echo "Usage: scripts/build-glimpse-core-prebuilt.sh [ios|android|both|all]" >&2
    exit 1
    ;;
esac
