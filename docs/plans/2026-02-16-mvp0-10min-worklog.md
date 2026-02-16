# MVP0 10-Minute Worklog

Date: 2026-02-16
Status: In Progress
Owner: Codex

## Goal

Split MVP0 implementation into short, independently verifiable steps.

## Completed Slots

- [x] Slot 1 (`MVP 0-04`): `knowledge_items.type` index added and synced
  - Files: `src/db/schema.ts`, `src/db/constants.ts`, `src/db/schema-sync.test.ts`
  - Validation: `bun test src/db/schema-sync.test.ts`

- [x] Slot 2 (`MVP 0-05`): metadata stub behavior validated in save use case
  - File: `src/features/capture/saveKnowledgeItem.test.ts`
  - Validation: `bun test src/features/capture/saveKnowledgeItem.test.ts`

- [x] Slot 3 (`MVP 0-06`): library card made non-clickable (no detail navigation in MVP0)
  - File: `src/components/library/KnowledgeItemCard.tsx`
  - Validation: `bun run lint`

- [x] Slot 4 (`MVP 0-06`): type label/icon visibility improved in list item
  - File: `src/components/library/KnowledgeItemCard.tsx`
  - Validation: `bun run lint`

- [x] Slot 5 (`MVP 0-07/08`): query parser tests expanded (pattern + fallback)
  - File: `src/features/search/parseQueryToKeyword.test.ts`
  - Validation: `bun test src/features/search/parseQueryToKeyword.test.ts`

- [x] Slot 6 (`MVP 0-06`): createdAt desc order assertion strengthened
  - File: `src/features/library/getAllKnowledgeItems.test.ts`
  - Validation: `bun test src/features/library/getAllKnowledgeItems.test.ts`

- [x] Slot 7 (`MVP 0-05`): save retry/failure paths hardened for ID collision handling
  - Files: `src/features/capture/saveKnowledgeItem.ts`, `src/features/capture/saveKnowledgeItem.test.ts`, `src/lib/id.test.ts`
  - Validation: `bun test src/features/capture/saveKnowledgeItem.test.ts src/lib/id.test.ts`

- [x] Slot 8 (`MVP 0-07`): search-empty and no-data empty states separated
  - Files: `app/(tabs)/library.tsx`, `src/components/library/EmptyLibraryState.tsx`
  - Validation: `bun run lint`

## Next Slots

- [x] Slot 9: add testable empty-state branching logic for library search
  - Files: `src/features/library/getLibraryEmptyState.ts`, `src/features/library/getLibraryEmptyState.test.ts`, `app/(tabs)/library.tsx`
  - Validation: `bun test src/features/library/getLibraryEmptyState.test.ts`

- [x] Slot 10: add focused smoke coverage for collect -> save -> library search path
  - File: `src/features/library/libraryFlow.smoke.test.ts`
  - Validation: `bun test src/features/library/libraryFlow.smoke.test.ts`

- [x] Slot 11: add focused test for search parser + empty-state combined behavior at screen logic boundary
  - Files: `src/features/library/resolveLibrarySearch.ts`, `src/features/library/librarySearchState.test.ts`, `app/(tabs)/library.tsx`
  - Validation: `bun test src/features/library/librarySearchState.test.ts`
- [x] Slot 12: run mobile-side smoke pass plan (`ios`) and capture blockers
  - Command attempts:
    - `bun run ios` -> `ERR_SOCKET_BAD_PORT (65536)` from Expo CLI/freeport
    - `bunx expo run:ios --port 8081` -> same `ERR_SOCKET_BAD_PORT (65536)`
    - `bunx expo run:ios --no-bundler` -> `Simulator app ... not installed` error
  - Current blocker: iOS Simulator runtime unavailable in this environment

- [x] Slot 13: apply Toss Hangul matching to keyword filter
  - Files: `src/features/search/filterKnowledgeItems.ts`, `src/features/search/filterKnowledgeItems.test.ts`, `package.json`
  - Notes: added `hangulIncludes` + `chosungIncludes` matching and 초성 검색 케이스

- [x] Slot 14: restore library item tap navigation with detail screen
  - Files: `src/components/library/KnowledgeItemCard.tsx`, `app/(tabs)/library.tsx`, `app/library/[id].tsx`, `app/_layout.tsx`
  - Notes: tapping memo/link now pushes `/library/[id]`

- [x] Slot 15: remove `stub-tag` artifact from tag generation and sanitize legacy rows
  - Files: `src/features/capture/stubs.ts`, `src/features/capture/stubs.test.ts`, `src/db/native-adapter/schemaMaintenance.ts`
  - Notes: new saves stop using placeholder tag; existing `stub-tag` values are cleaned during DB sanitize

## Baseline Validation

- `bun run lint`
- `bun run web` (startup smoke check)
