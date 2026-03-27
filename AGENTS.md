# AGENTS.md

## Project overview

- This repository is an Expo-based React Native app.
- Entry point is managed by `expo-router`.
- Primary package manager is Bun, and scripts are defined in `package.json`.

## Setup commands

- Install dependencies: `bun install`
- Start development server: `bun run start`
- Run iOS app: `bun run ios`
- Run Android app: `bun run android`
- Run web app: `bun run web`
- Run lint: `bun run lint`

## Dev environment tips

- Use Bun stable release.
- Prefer small, focused changes over broad refactors.
- Before changing architecture or dependencies, check existing patterns in the codebase first.
- For typed Nitro <-> Rust bridge work, read [`apps/mobile/docs/typed-bridge-development.md`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/docs/typed-bridge-development.md) before changing the FFI surface.

## Testing instructions

- Run tests: `bun test` or `bun test <file>`
- Minimum validation before finishing work:
- Run `bun run lint`.
- Smoke-check the target platform with one of: `bun run ios`, `bun run android`, `bun run web`.

## Database persistence

- The mobile app currently owns its local persistence flow.
- Keep storage changes aligned with the active mobile storage implementation and app-side data contracts.
- Before changing the persistence layer, check the current client/store wiring in the codebase first.

## Code style

- Use TypeScript and functional React components.
- Keep logic in reusable hooks/utilities when it improves readability.
- Follow existing naming and file organization patterns in the nearest directory.
- Do not introduce unrelated formatting or large-scale renames.

## File complexity guideline

- When editing any code file, if it is over ~200 lines, pause and assess whether responsibilities should be split.
- Prefer extracting reusable UI to `src/components/<feature>` and stateful logic to hooks/utilities when it improves maintainability.
- Mention the split assessment briefly in the final handoff when a touched file is over this threshold.

## UI architecture (Atomic Design)

- Treat `src/ui` as atomic layer only (atoms/primitives/icons/tokens).
- Keep `src/ui` components stateless and reusable; no feature/domain behavior inside.
- Do not place composed, feature-aware UI in `src/ui` (for example list items, search bars, page headers tied to a screen flow).
- Put composed UI in `src/components/<feature>` (or screen-local component files when scope is very small).
- Screens in `app/` should orchestrate state, queries, and actions, and consume atomic parts from `src/ui/*` plus composed parts from `src/components/*`.
- Avoid `<ui.*>` namespaced composition for non-atomic constructs; prefer explicit named imports.

## PR instructions

- Keep each change focused on a single purpose.
- Include a short summary of what changed and why.
- List validation commands you ran and their results.
- Ensure `bun run lint` passes before requesting review.
