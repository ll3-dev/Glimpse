# Real Usage Recovery — Local Builds, Capture Friction, Today Card, Chat Tools (2026-09-08)

Owner-approved follow-up to the 2026-09-08 brainstorm ("실제로 사용을 잘 못하고 있다").
Investigation found most capture entry points already exist (share extension direct-save,
clipboard auto-detect, OCR, desktop global hotkey + tray). The real gaps that block daily use:

1. No documented way to keep a Release build permanently on the owner's own devices.
2. Camera capture and Shortcuts image input are missing (already flagged as candidates in
   `2026-08-31_18-23-35_project-direction-and-next-steps.md`).
3. Nothing surfaces "what happened today" — no reason to reopen the app.
4. Chat AI has no tools (`router.ts` is a provider router; chat is read-only RAG), so the AI
   can never act on the library.

TestFlight / store / CI signing infra is **excluded** — the owner uses local builds only.

## Area A — Daily-driver local build path (docs + scripts)

- Add `apps/mobile` scripts `ios:release:device` / `android:release` and root aliases.
- Document the repeatable local flow (iOS personal-team Release install, desktop
  `tauri:build:release` / `tauri:build:llm`) in `docs/daily-driver-builds.md`.
- No code-path changes; existing `tauri:build:release` is only referenced.

## Area B-1 — Camera capture (mobile)

- `apps/mobile/src/hooks/useCaptureImage.ts` (new): permission + `launchImageLibraryAsync`
  / `launchCameraAsync`, returning a picked URI or null. Keeps `UnifiedCaptureForm` lean.
- `UnifiedCaptureAssistantBar`: add a camera chip next to the existing gallery chip.
- No `app.json` change needed: `expo-image-picker`'s Android manifest already declares
  `android.permission.CAMERA` (the plugin only removes it for `cameraPermission: false`),
  and the iOS plist string already exists.

## Area B-2 — Shortcuts image input (iOS)

Current data contract: screenshots persist OCR text as `body`; image bytes are not stored
(`ScreenshotInput.imageData` is validation-only). This area stays inside that contract.

- `CaptureQuickNoteIntent.swift`: optional `IntentFile` image parameter; writes the file into
  the App Group container (`PendingShareImages/`) and records it under a new
  `ll3.krShareImageKey` defaults key, reusing the direct-save flag.
- `AppGroupModule.swift`: `getPendingShareData` also returns `imagePaths`;
  new `replacePendingShareImages(paths)` partial-update (deletes absorbed files);
  full clear / direct-save flag check account for the image key.
- JS: `process-share-data.ts` saves each pending image as a `screenshot` item
  (`imageData` = file path for validation, `body` = OCR text when the optional
  `extractText` dep succeeds); `process-pending-batch.ts` drops absorbed image paths;
  `pending-share-store.ts` adds `removePendingShareImages`.

## Area C — Today summary card ("다시 여는 이유")

- `packages/features/src/daily/today-summary.ts` (new, pure): `buildTodaySummary` from
  items + recommendations — today's captures (count + preview list) and connections created
  today. Timestamps are `Date.now()` ms; day boundary is local midnight.
- Mobile `digest` tab and desktop `digest` page: a `TodaySummaryCard` section above the
  existing recommendation content.

## Area D — Chat tool calling (desktop, BYOK OpenAI-compatible)

- `apps/desktop/src/features/ai/tools/` (new):
  - `tool-schemas.ts` — OpenAI-format wire schemas for `search_knowledge`,
    `list_recent_knowledge`, `save_note`.
  - `tool-definitions.ts` — executors over the rustra core client (dependency-injected);
    embedding cosine ranking with a lexical token-overlap fallback, and `save_note`
    reusing capture conventions (`labelStatus: 'pending'`, `nextReviewAt = +24h`) so
    labeling/graph automation pick the item up.
  - `byok-tools.ts` — non-streaming `chat/completions` round trip with `tools` /
    `tool_choice:auto`, parsing `tool_calls`. Only `openai` / `deepseek` / `custom`
    provider shapes (Anthropic/Google tool formats differ — out of scope). 401/403/429
    throw like `byok-provider`; other failures return null (fallback).
  - `tool-loop.ts` — up to 4 tool rounds; failed tools become `{error}` tool results the
    model can recover from. Unavailable/exhausted → null. v1 answers are delivered as a
    single burst (same as the existing non-streaming fallback), not token-streamed.
- `ChatView.tsx`: try the tool loop first when `settings.chat.toolsEnabled !== false`
  (new settings flag, default on, no UI toggle yet); null → existing RAG path unchanged.
  `search_knowledge` runs become reference chips.

## Non-goals

- Web clipper / browser extension (separate sub-project).
- HealthKit / Watch data (needs native module + privacy review; revisit after the base
  loop works).
- Persisting image bytes for screenshots (data-contract change in the Rust schema).
- Store/TestFlight/EAS infra, CI signing, auto-update.

## Validation

- `bun test` for new/changed units (today-summary, process-share-data images,
  pending-share-processor images, tool loop, byok tool parsing, tool executors).
- `bun run lint` (mobile + desktop).
- Native Swift changes compile-checked only via Xcode build on the owner's machine —
  flagged in the handoff as a manual gate.
