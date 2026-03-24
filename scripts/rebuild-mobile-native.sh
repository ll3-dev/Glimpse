#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
BRIDGE_DIR="$MOBILE_DIR/modules/glimpse-core"

PLATFORM="${1:-ios}"
RESET_CACHE="${RESET_CACHE:-0}"
SKIP_INSTALL="${SKIP_INSTALL:-0}"
SKIP_PODS="${SKIP_PODS:-0}"

usage() {
  cat <<'EOF'
Usage: scripts/rebuild-mobile-native.sh [ios|android|both] [--reset-cache] [--skip-install] [--skip-pods]

Examples:
  scripts/rebuild-mobile-native.sh ios
  scripts/rebuild-mobile-native.sh ios --reset-cache
  scripts/rebuild-mobile-native.sh both --skip-install
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    ios|android|both)
      PLATFORM="$1"
      shift
      ;;
    --reset-cache)
      RESET_CACHE=1
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --skip-pods)
      SKIP_PODS=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

run_step() {
  echo
  echo "==> $1"
  shift
  "$@"
}

if [[ "$SKIP_INSTALL" != "1" ]]; then
  run_step "Installing workspace dependencies" bun install
fi

run_step "Building mobile bridge package" bun run mobile:bridge:build

case "$PLATFORM" in
  ios)
    run_step "Rebuilding iOS prebuilt Rust archive" bun run mobile:bridge:prebuilt:ios
    ;;
  android)
    run_step "Rebuilding Android prebuilt Rust archives" bun run mobile:bridge:prebuilt:android
    ;;
  both)
    run_step "Rebuilding all prebuilt Rust archives" bun run mobile:bridge:prebuilt:all
    ;;
esac

if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "both" ]]; then
  if [[ "$SKIP_PODS" != "1" ]]; then
    run_step "Installing iOS pods" bash -lc "cd \"$MOBILE_DIR/ios\" && pod install"
  fi
fi

if [[ "$RESET_CACHE" == "1" ]]; then
  if command -v watchman >/dev/null 2>&1; then
    run_step "Clearing Watchman state" watchman watch-del-all
  else
    echo
    echo "==> Skipping Watchman reset (watchman not installed)"
  fi

  run_step "Clearing Metro cache" bash -lc "cd \"$MOBILE_DIR\" && npx react-native start --reset-cache >/tmp/glimpse-metro-reset.log 2>&1 & sleep 5; pkill -f 'react-native start --reset-cache' || true; tail -n 20 /tmp/glimpse-metro-reset.log || true"
fi

case "$PLATFORM" in
  ios)
    run_step "Rebuilding iOS app" bun run ios
    ;;
  android)
    run_step "Rebuilding Android app" bun run android
    ;;
  both)
    run_step "Rebuilding iOS app" bun run ios
    run_step "Rebuilding Android app" bun run android
    ;;
esac
