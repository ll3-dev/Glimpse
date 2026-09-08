# Daily-Driver Local Builds

How to keep a Release build of Glimpse permanently on your own devices, without TestFlight,
EAS, or any store infrastructure. Everything below runs on your machine only.

## Mobile — iOS device

```bash
bun run ios:release:device   # expo run:ios --device --configuration Release
```

- Requires the device to be connected and selected in Xcode once. Signing uses your Apple ID
  (personal team) with automatic signing for `kr.ll3.glimpse`.
- A free personal-team provisioning profile expires after **7 days**; re-running the same
  command refreshes it. A paid Apple Developer account extends this to a year.
- Re-running with the same bundle identifier **replaces the app in place** — local data
  (App Group SQLite, MMKV) survives. Do not change `bundleIdentifier`.
- The Share Extension and Shortcuts ("빠른 노트 캡처") entitlements use the shared
  App Group `group.kr.ll3.glimpse`; personal teams support App Groups.

## Mobile — Android device

```bash
bun run android:release      # expo run:android --variant release
```

- Installs the release variant over the debug one only if signatures match; uninstalling
  first loses local data, so prefer keeping one signing key.

## Desktop — macOS

```bash
bun run desktop:tauri:build          # no local LLM
bun run desktop:tauri:build:llm      # with llama.cpp (local LLM feature)
bun run --cwd apps/desktop tauri:build:release   # release config (scripts/prepare-release-config.ts)
```

- The `.dmg` / `.app` bundle lands in `apps/desktop/src-tauri/target/release/bundle/`.
  Drag it into `/Applications`; the tray + global capture shortcut (`Ctrl/Cmd+Shift+K`)
  work from anywhere on the desktop.

## Local AI models (fully local runtime)

Since the 2026-09-08 local-only switch there is no cloud BYOK path — all AI runs
on-device (mobile) or on your machine (desktop).

- **Mobile**: the model catalog offers a curated pair — 경량 `qwen3.5-2b-q4`
  (~1.2GB) and 균형 `qwen3.5-4b-q4` (~2.6GB) — plus Apple Intelligence as the
  default engine. Deep users can side-load other GGUF files manually instead of
  downloading from the catalog:
  - iOS: put the `.gguf` in the app's `Documents/models/` directory (Finder file
    sharing or Xcode device download), then restart the app.
  - Android: put the `.gguf` in `Download/GlimpseModels/`.
  - The file is picked up on the next model-list sync; llama.rn-compatible
    chat GGUFs only.
- **Desktop**: settings → AI 공급자 모드 offers the managed runtime (GGUF
  auto-download via the model manager) or an external local server. LM Studio /
  Ollama / llama.cpp servers on `localhost:1234` / `:11434` / `:8080` are
  auto-detected in settings with a one-click "이 모델 사용"; any other
  OpenAI-compatible URL can be entered manually.

## Daily loop checklist

1. Both apps open the same data via the desktop sync server — see
   [desktop-mobile-sync.md](./desktop-mobile-sync.md) for pairing.
2. Capture from anywhere: OS share sheet (mobile), lock-screen Shortcuts (mobile),
   tray / global shortcut (desktop).
3. Reopening anchor: the digest tab's today summary shows what was captured and which
   connections appeared during the day.
