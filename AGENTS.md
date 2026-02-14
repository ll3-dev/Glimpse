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

## Testing instructions

- There is currently no dedicated test script in `package.json`.
- Minimum validation before finishing work:
- Run `bun run lint`.
- Smoke-check the target platform with one of: `bun run ios`, `bun run android`, `bun run web`.

## Code style

- Use TypeScript and functional React components.
- Keep logic in reusable hooks/utilities when it improves readability.
- Follow existing naming and file organization patterns in the nearest directory.
- Do not introduce unrelated formatting or large-scale renames.

## PR instructions

- Keep each change focused on a single purpose.
- Include a short summary of what changed and why.
- List validation commands you ran and their results.
- Ensure `bun run lint` passes before requesting review.
