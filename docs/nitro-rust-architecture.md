# Nitro, Rust, and SQLite Architecture

## Scope and Current Status

This document describes the recommended cross-platform architecture for Glimpse around a TypeScript-first API contract, a Rust core, a thin C++ Nitro shim for React Native, and SQLite-backed local-first storage.

It also records the current repository state as of 2026-03-26:

- `packages/shared/src/index.ts` currently contains the concrete cross-layer data types used by the app.
- `packages/core-rust/src/*` contains a real Rust core and SQLite storage implementation.
- Mobile currently does **not** use Nitro or a C++ shim. `apps/mobile/src/features/core/native-core-client.ts` and `apps/mobile/src/features/core/native-core-client.native.ts` both re-export a TypeScript local adapter.
- Desktop currently does **not** reuse `packages/core-rust`; it uses a separate Tauri command bridge in `apps/desktop/src-tauri/src/commands.rs`.
- `apps/mobile/tsconfig.json` still points `@glimpse/core` to `../../packages/core/src/*`, but `packages/core` is not present in this checkout. That is an active contract and tooling drift risk.

Where this document describes Nitro and C++ behavior, and those files do not yet exist in the repository, that guidance is an implementation recommendation and explicit inference from the current architecture direction.

## 1. Architecture Overview

### Target flow

The intended mobile flow should be:

`TypeScript Nitro spec -> Nitro/Nitrogen generated bindings -> thin C++ shim -> Rust core -> SQLite`

The intended desktop flow should be:

`TypeScript port contract -> desktop adapter -> Rust core -> SQLite`

### Why the TypeScript spec should be the SSOT

The TypeScript spec should be the single source of truth because:

- The React Native app consumes the API first.
- Nitro code generation starts from TypeScript.
- Frontend feature teams reason in TypeScript, not in C++ or Rust.
- A stable TS contract allows desktop adapters and tests to target the same semantics.
- The current repo already defines product-facing shapes in TypeScript under [`packages/shared/src/index.ts`](/Users/loopy/dev/ll3/Glimpse/packages/shared/src/index.ts).

The spec must define:

- exported data types
- async method signatures
- nullability
- enum/string-union value sets
- error surface visible to JS

It must not define:

- platform-specific storage paths
- threading details
- Rust-internal lifetimes or borrowing
- SQLite query details

### Role of each layer

| Layer | Role | Should contain | Should not contain |
|---|---|---|---|
| TypeScript spec | Canonical API contract | data models, request/response types, method signatures, visible error model | storage code, C++ details, Rust-only types |
| Generated Nitro layer | Mechanical bridge code | generated bindings, type marshalling, Promise glue | business logic, hand-edited behavior |
| C++ shim | FFI boundary adapter | value conversion, lifecycle handles, async dispatch into Rust | domain logic, schema logic, validation policy |
| Rust core | Business logic and persistence | repositories, use cases, validation, migrations, SQLite ownership | JS platform details, React state, UI-oriented shaping |
| Desktop adapter | Platform integration | filesystem/db path resolution, app lifecycle, platform IO | duplicated business rules from Rust |

### Current-state observations from the repo

- Shared product types already exist in [`packages/shared/src/index.ts`](/Users/loopy/dev/ll3/Glimpse/packages/shared/src/index.ts).
- Rust models attempt to mirror them in [`packages/core-rust/src/models.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/models.rs).
- Mobile still routes through a local TypeScript adapter in [`apps/mobile/src/features/core/local-core-client.ts`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/src/features/core/local-core-client.ts).
- That local adapter persists via MMKV-backed key-value storage, not SQLite, through [`apps/mobile/src/lib/storage.ts`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/src/lib/storage.ts).
- Rust owns a SQLite schema in [`packages/core-rust/src/storage/schema.sql`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/storage/schema.sql).

## 2. Layer Responsibilities

### TypeScript spec layer

**Responsibility**

- Define the canonical API and all cross-boundary types.

**Allowed logic**

- structural typing
- documentation comments
- compatibility aliases during migration
- simple value-object grouping

**Forbidden logic**

- storage implementation
- generated code patches
- platform branching
- business rules

**Data ownership**

- Owns names and shapes, not runtime data storage.

**Async behavior**

- Declares which APIs are sync and which return `Promise`.

**Error handling strategy**

- Defines the normalized JS-visible error shape and documented error codes.

### Generated Nitro/Nitrogen layer

**Responsibility**

- Materialize the TS spec into native bridge code.

**Allowed logic**

- generated object wrappers
- Promise adapters
- deterministic type marshalling

**Forbidden logic**

- manual edits
- custom domain behavior
- hidden shape changes

**Data ownership**

- Temporary transport ownership only.

**Async behavior**

- Convert JS `Promise` APIs into native async scheduling hooks.

**Error handling strategy**

- Transport native exceptions into the normalized bridge error representation.

### C++ shim layer

**Responsibility**

- Convert Nitro-generated C++ types into Rust FFI-safe forms and back.

**Allowed logic**

- handle lookup
- pointer ownership
- bounded string/vector conversion
- background thread dispatch for blocking Rust calls

**Forbidden logic**

- business rules
- SQLite queries
- retry policy
- caching policy
- mutation of domain semantics

**Data ownership**

- Owns bridge-local handles only.
- Must not become the long-term owner of domain data.

**Async behavior**

- Owns dispatch from JS-facing async methods onto a background executor or worker queue before entering blocking Rust work.

**Error handling strategy**

- Translate raw FFI failure into stable bridge errors.
- Never leak raw panic text, UB-sensitive state, or platform-private details to JS.

### Rust core layer

**Responsibility**

- Own business logic, validation, storage contracts, repositories, migrations, and query semantics.

**Allowed logic**

- domain rules
- repository implementations
- SQLite access
- indexing strategy
- migration orchestration
- normalization of persisted entities

**Forbidden logic**

- React Native concepts
- UI formatting
- C++ memory policy
- platform-specific presentation decisions

**Data ownership**

- Owns durable records and heavy computation.
- Should own the SQLite connection lifecycle and repository state.

**Async behavior**

- Can be internally synchronous or async, but the external FFI entrypoints must present a predictable blocking contract.
- Long-running work must execute off the JS thread.

**Error handling strategy**

- Emit structured domain/infrastructure errors with stable categories.

### Optional desktop adapter layer

**Responsibility**

- Bind desktop shell APIs to the same Rust core semantics.

**Allowed logic**

- app-dir resolution
- OS integration
- window/app lifecycle plumbing

**Forbidden logic**

- forking domain rules away from mobile
- ad hoc type changes not present in the TS spec

**Data ownership**

- Owns platform resources and passes durable work into Rust.

**Async behavior**

- Can use Tauri commands or another adapter, but should preserve the same logical API contract and error model.

**Error handling strategy**

- Normalize shell-specific failures into the shared JS-visible error shape.

## 3. Type Mapping Rules

### Allowed TypeScript subset at the FFI boundary

Use a deliberately small and stable subset:

- `string`
- `number` with explicit semantic docs
- `boolean`
- `null`
- `T | null`
- `T[]`
- named object interfaces
- string literal unions
- `Promise<T>`

### Banned or strongly discouraged patterns

- `any`
- `unknown` at the public boundary
- index signatures
- mapped types in public contracts
- conditional types in public contracts
- deeply nested discriminated unions
- overloaded function signatures
- functions passed as arguments
- `Date`
- `bigint`
- branded opaque TS-only types without explicit transport representation

### Conversion rules

| TypeScript | Rust | Notes |
|---|---|---|
| `string` | `String` | owned UTF-8 string |
| `string \| null` | `Option<String>` | prefer explicit nullable field over omitted field |
| `boolean` | `bool` | direct |
| `number` | `i64`, `u64`, or `f64` | choose one per field and document it |
| `T[]` | `Vec<T>` | preserve order |
| object interface | `struct` | use named structs only |
| string union | `enum` with explicit serialized names | do not rely on numeric ordinals |
| `Promise<T>` | sync FFI + async native scheduling | JS sees Promise, Rust entrypoint remains blocking |
| nested object | nested `struct` | flatten if frequently patched or optional-heavy |
| nullable nested object | `Option<Struct>` | document null vs empty object semantics |

### Specific rules

#### `string -> Rust String`

- Strings crossing into Rust should be owned `String`.
- Borrowed `&str` is an internal optimization only.
- C++ must copy from JS-managed memory into Rust-owned storage before the JS frame ends.

#### `nullable -> Option<T>`

- `null` in the TS spec maps to `Option<T>::None`.
- Avoid meaning overloading where both `null` and omitted mean different things unless the API is patch-specific.

#### `array -> Vec<T>`

- Arrays map to `Vec<T>`.
- Use arrays only for ordered collections.
- For set semantics such as tags, normalize in Rust if needed.

#### `object literals -> Rust structs`

- Every object crossing FFI should be a named TS interface and a named Rust struct.
- Inline anonymous object types should be avoided in the spec because they are harder to document, diff, and generate consistently.

#### `string unions -> Rust enums`

- Use string unions in TS and `serde(rename_all = "...")` or explicit rename attributes in Rust.
- Never use integer enum transport across the JS boundary.

#### booleans / numbers

- Do not leave numeric semantics implicit.
- Document whether a `number` is:
  - `i64` timestamp in milliseconds
  - `f64` score
  - bounded integer count
- Current repo example: timestamps are modeled as `number` in TS and `i64` in Rust, such as `createdAt` vs `created_at`.

#### promise-returning APIs

- Promise APIs should represent operations that may block, allocate, access SQLite, or do significant work.
- On mobile, treat almost all persistence APIs as async even if Rust internally executes synchronously.

#### nested objects

- Limit nesting depth.
- If a nested object is reused across APIs, give it a stable named type.
- If a nested object is primarily transport detail, flatten it before the FFI boundary.

#### result/error types

- Do not encode Rust `Result<T, E>` directly into ad hoc success unions in TS.
- Native exceptions or rejected Promises should carry a stable normalized error object.
- Reserve value-level result unions for domain outcomes, not transport failures.

### What should be flattened or normalized before FFI

- patch types with many optional nullable fields
- JS-only casing transforms
- UI-only derived fields
- unions with more than one discriminator
- polymorphic payloads that require runtime reflection

### Current drift already visible

- TS uses camelCase fields such as `createdAt` and `labelStatus` in [`packages/shared/src/index.ts`](/Users/loopy/dev/ll3/Glimpse/packages/shared/src/index.ts).
- Rust uses snake_case fields such as `created_at` and `label_status` in [`packages/core-rust/src/models.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/models.rs).
- TS recommendation fields are `itemA_id` and `itemB_id`, mixing camel and snake in the same type. Rust uses `item_a_id` and `item_b_id`. This is a concrete instability and should be normalized.
- TS patch types currently rely on `Partial<...>`, while Rust patch structs use `Option<T>`. That loses the distinction between "field omitted" and "field explicitly cleared to null" unless a tri-state patch model is introduced.

## 4. Async and Concurrency Model

### Where async starts and ends

- JS starts async at the public API boundary.
- Nitro/C++ should schedule work off the JS thread for anything that can block.
- Rust FFI entrypoints should be treated as blocking functions called from a worker thread.

### Which layer owns threading

- JS owns Promise composition.
- C++ shim owns native thread dispatch for mobile bridge calls.
- Rust owns its own internal synchronization and database access discipline.

Do not let all three layers invent independent concurrency models.

### Promise-based JS APIs to Rust async

Recommended mapping:

1. TS declares `Promise<T>`.
2. Nitro-generated layer exposes async native signature.
3. C++ shim queues work on a background executor.
4. Worker thread calls blocking Rust FFI entrypoint.
5. Rust performs SQLite and domain logic.
6. C++ resolves or rejects the JS Promise.

If Rust later uses Tokio or another runtime internally, that is an implementation detail. The FFI contract should still look like a blocking call invoked from a worker thread unless there is a strong reason to expose a more complex handle-based async model.

### Blocking work such as SQLite

- SQLite work should live in Rust.
- It must never run on the JS thread.
- Prefer one Rust-owned database access layer with explicit serialized write behavior.
- If concurrent reads/writes are needed, document WAL mode, transaction scope, and connection strategy.

### Cancellation, timeouts, and long-running work

- Default CRUD APIs can be non-cancellable.
- Long-running work such as search, sync, reindexing, or embeddings should use explicit operation handles or cancellation tokens in the TS spec.
- Timeouts belong at the adapter or caller level unless they are domain semantics.
- If cancellation is best-effort only, document that clearly.

### Common failure modes and race conditions

- two JS calls mutating the same record concurrently
- stale update patches overwriting newer values
- mobile app background/foreground lifecycle interrupting in-flight writes
- multiple native calls sharing a non-thread-safe SQLite connection incorrectly
- desktop and mobile diverging on transaction semantics
- Promise resolution after the JS caller has logically abandoned the result

### Current-state repository note

The existing Rust storage holds a single `rusqlite::Connection` inside `SqliteStorage` in [`packages/core-rust/src/storage/sqlite/mod.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/storage/sqlite/mod.rs). That is acceptable for a simple single-threaded prototype, but it is not yet a documented cross-thread mobile execution design.

## 5. Memory and Ownership Model

### Ownership rules

- JS owns UI state and short-lived request objects.
- C++ owns only bridge-local converted values and opaque handles.
- Rust owns durable domain data, large intermediate datasets, and SQLite-backed state.

### Large data guidance

- Keep large collections in Rust as long as possible.
- Return paginated or filtered slices to JS instead of full tables.
- Avoid materializing entire SQLite tables into JS unless a screen truly needs them.

### Avoiding duplicate copies

- Convert once at the bridge edge.
- Avoid JSON re-serialization between C++ and Rust for strongly typed calls.
- Prefer passing scalar fields and typed structs rather than JSON blobs.
- For large binary or text payloads, consider file-backed handles or opaque IDs instead of repeated string copies.

### Where serialization/deserialization occurs

- TS <-> Nitro/C++: generated marshalling
- C++ <-> Rust: explicit FFI-safe conversion
- Rust <-> SQLite: repository serialization for stored arrays/enums where needed

Current repo example:

- Rust stores arrays such as `tags`, `labels`, and `provisional_labels` as JSON strings in SQLite in [`packages/core-rust/src/storage/sqlite/knowledge.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/storage/sqlite/knowledge.rs).

### What should stay in Rust

- repository filtering
- due-item computation
- recommendation generation
- migration code
- conflict resolution logic
- search indexing and query planning

### What may be materialized in JS

- screen-sized result lists
- currently viewed entity details
- user input drafts
- presentation-only derived state

### Reducing resident memory usage

- page query results
- avoid eager loading all items
- stream or chunk expensive exports/imports
- keep embeddings or large vectors out of JS unless explicitly required
- avoid duplicate caches in JS and Rust for the same dataset

## 6. SQLite and Local-First Data Strategy

### Where SQLite access should live

SQLite access should live in Rust, behind repositories or storage modules, not in JS and not in C++.

That keeps:

- query semantics centralized
- migrations consistent
- performance-critical filtering native
- desktop reuse straightforward

### Why Rust should own repository/query logic

Rust is the only layer shared cleanly across mobile and desktop in the target architecture. Putting repositories in Rust means:

- one source of truth for persistence semantics
- one place for indexes and transaction tuning
- no duplication between React Native and desktop shell code
- less JS heap pressure

### Schema, migrations, and repository contracts

Document separately:

- schema version
- migration sequence
- repository APIs
- invariants per table
- indexes and why they exist
- soft-delete behavior

The current schema lives in [`packages/core-rust/src/storage/schema.sql`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/storage/schema.sql). It should evolve into:

- `schema/0001_init.sql`
- `schema/0002_...sql`
- a migration runner in Rust
- docs explaining repository-to-table ownership

### Mobile and desktop shared semantics

Mobile and desktop do not need identical platform implementations, but they should share:

- logical entities
- field meanings
- validation rules
- migration ordering
- error codes
- repository semantics

Desktop may use a different filesystem location or shell lifecycle, but the data contract should remain stable.

### Offline-first architectural implications

- writes must succeed without network access
- IDs should be generated locally
- sync metadata must be explicit if remote sync is added later
- repositories should preserve enough local history for retries/conflict resolution
- APIs should avoid depending on server-derived shape normalization

## 7. Error Boundary Design

### Rust internal errors

Rust should distinguish at least:

- `InvalidInput`
- `NotFound`
- `Conflict`
- `Database`
- `Serialization`
- `Timeout`
- `Internal`

The current repo already defines `Database`, `Serialization`, `NotFound`, and `InvalidInput` in [`packages/core-rust/src/error.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/error.rs). That is a good start, but not yet sufficient for a stable bridge contract.

### C++ shim translation errors

The shim should catch and normalize:

- invalid UTF-8 or conversion failure
- null-pointer or handle lookup failure
- unexpected Rust panic crossing an FFI boundary
- executor shutdown or task dispatch failure

### Nitro/JS-visible errors

JS should receive a normalized error shape such as:

```ts
export interface CoreBridgeError {
  code:
    | 'INVALID_INPUT'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'DATABASE'
    | 'TIMEOUT'
    | 'CANCELLED'
    | 'INTERNAL';
  message: string;
  retryable: boolean;
  details?: Record<string, string | number | boolean | null>;
}
```

### What is safe to expose to JS

- stable error code
- user-safe message
- retryability
- entity type and ID if not sensitive
- validation field names

### What should not be exposed

- raw SQL strings
- filesystem paths unless explicitly needed
- panic backtraces
- internal pointer/handle data
- platform-private diagnostics

## 8. Codegen Strategy

### Recommended documentation model

1. TS spec is the canonical input.
2. A validator checks allowed boundary types before codegen.
3. Nitro/Nitrogen generates native bridge bindings.
4. Generated Rust/C++ support code may exist, but manual logic stays in dedicated implementation files.
5. Documentation references the TS spec first, then generated output locations, then manual native implementation points.

### TS spec as input

Keep specs under a dedicated location, for example:

- `packages/specs/src/core/CoreClient.nitro.ts`
- `packages/specs/src/core/types.ts`

The current repo uses `packages/shared/src/index.ts` for shared types. That is usable today, but a dedicated specs package will scale better once code generation begins.

### Validation of allowed types

Add a boundary validation step that rejects:

- unsupported unions
- implicit `any`
- inline anonymous public object types
- omitted numeric semantics
- public patch types that cannot express clear/omit distinctly

### Generated bindings

Generated output should live in a clearly disposable tree, for example:

- `apps/mobile/src/features/core/generated/nitro/*`

Never hand-edit generated files.

### Generated or semi-generated Rust types

Two reasonable models:

- generate only transport structs and manually map them into domain structs
- generate transport structs plus explicit conversion traits into domain types

Recommended choice: generate transport structs only, then manually map into domain structs. That keeps the Rust core independent of bridge tooling.

### Generated or semi-generated C++ wrappers

- generated base spec wrappers are acceptable
- manual code belongs in a small shim implementation file only

### Where manual code is allowed

- TS spec comments and examples
- C++ shim implementation
- Rust FFI adapter
- Rust domain core
- desktop adapter
- migration runner

### Preventing documentation drift

- generate API reference docs from the TS spec
- require code review to update docs when spec files change
- include a CI check that detects generated-file diffs
- keep a current-state section in this document and update it when the bridge lands

## 9. Recommended Project Structure

```text
packages/
  specs/
    src/
      core/
        CoreClient.nitro.ts
        types.ts
        errors.ts
  shared/
    src/
      domain/
        core-types.ts
  core-rust/
    src/
      lib.rs
      ffi/
        mod.rs
        core_client.rs
        error.rs
      domain/
        models.rs
        services/
      storage/
        mod.rs
        sqlite/
          mod.rs
          repositories/
          migrations/
            0001_init.sql
            0002_*.sql

apps/
  mobile/
    src/
      features/
        core/
          native/
            CoreClient.nitro.ts
            generated/
            HybridCoreClient.cpp
            rust_core.h
          mobile-core-client.ts
  desktop/
    src/
      features/
        core/
          desktop-core-client.ts
    src-tauri/
      src/
        core_adapter.rs

docs/
  architecture/
    nitro-rust-architecture.md
  api/
    core-client.md
  storage/
    sqlite-schema.md
```

### Mapping this to the current repo

Current repo equivalents:

- shared types: [`packages/shared/src/index.ts`](/Users/loopy/dev/ll3/Glimpse/packages/shared/src/index.ts)
- Rust core: [`packages/core-rust/src/lib.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/lib.rs)
- SQLite storage: [`packages/core-rust/src/storage/sqlite/mod.rs`](/Users/loopy/dev/ll3/Glimpse/packages/core-rust/src/storage/sqlite/mod.rs)
- desktop shell adapter: [`apps/desktop/src-tauri/src/commands.rs`](/Users/loopy/dev/ll3/Glimpse/apps/desktop/src-tauri/src/commands.rs)

## 10. Developer Rules

- Treat the TS Nitro spec as the canonical API contract.
- Do not invent native-only public types outside the TS spec.
- Never put business logic in the C++ shim.
- Keep the shim thin and mechanical.
- Keep Rust platform-agnostic.
- Keep SQLite access in Rust.
- Make blocking native work async from JS’s point of view.
- Do not run SQLite work on the JS thread.
- Prefer explicit named structs over inline object shapes.
- Prefer string unions over integer enums at the JS boundary.
- Do not expose `any`, `unknown`, `Date`, or callback-heavy APIs across FFI.
- Keep JS state minimal; do not mirror the full database into memory by default.
- Document numeric semantics for every public `number`.
- Use explicit error codes and a normalized error shape.
- Never hand-edit generated bindings.
- Keep desktop adapters contract-compatible with mobile.

## 11. Open Risks and Tradeoffs

### Current architectural risks

- The mobile bridge is still a TypeScript local adapter, so the documented target and actual runtime differ today.
- `@glimpse/core` path aliases point to a missing package in [`apps/mobile/tsconfig.json`](/Users/loopy/dev/ll3/Glimpse/apps/mobile/tsconfig.json).
- Shared types and Rust models already show casing and field-name drift.

### Versioning risks

- generated bindings may become stale if the TS spec changes without regeneration
- Rust models may drift from TS if maintained manually
- desktop adapters may evolve a separate API surface

### Generated-code risks

- developers editing generated files
- hidden generator upgrades changing wire behavior
- generated naming conventions not matching existing domain naming

### Async risks

- blocking SQLite work accidentally running on the JS thread
- unresolved cancellation semantics for long-running operations
- race conditions between concurrent update patches

### Memory risks

- repeated copies of large payloads across JS, C++, and Rust
- eager loading full SQLite tables into JS
- binary/vector payloads materialized on both sides of the bridge

### SQLite locking risks

- single-connection prototypes not scaling to real concurrent access
- long transactions blocking reads or writes
- desktop and mobile using different journaling or transaction settings

### Future desktop reuse risks

- Tauri commands diverging from Nitro-backed mobile behavior
- shell-specific types leaking into shared contracts
- desktop adopting alternate persistence semantics that break portability

## 12. Decision Summary

### Recommended architecture

- Define a dedicated TS Nitro spec as the SSOT.
- Generate Nitro bindings from that spec.
- Keep a very thin C++ shim whose only job is type conversion, handle ownership, and worker-thread dispatch.
- Keep all business logic, repository logic, migrations, and SQLite ownership in Rust.
- Keep desktop as a separate adapter layer that reuses the same Rust core.

### Recommended constraints

- small allowed TS boundary subset
- no business logic in generated code or the C++ shim
- no SQLite access from JS
- explicit normalized error surface
- explicit documentation of numeric semantics, nullability, and patch semantics

### What should be implemented first

1. Create the canonical `CoreClient.nitro.ts` spec and boundary type rules.
2. Normalize existing shared type naming and fix current drift, especially casing and recommendation field names.
3. Add a dedicated bridge-facing Rust transport layer and normalized error model.
4. Implement the Nitro-generated mobile bridge and thin C++ shim.
5. Move mobile persistence calls from the TypeScript local adapter to Rust-owned SQLite.

### What can be deferred

- desktop adapter unification after the Rust mobile bridge is stable
- cancellation for long-running jobs
- code generation of Rust transport structs if manual mapping remains manageable
- advanced query streaming/pagination features until real data volume requires them

## Example: One Type Flowing from TS to C++ to Rust

### TypeScript spec

```ts
export interface InitializeReviewScheduleInput {
  createdAt: number;
  intervalMs?: number;
}

export interface InitializeReviewScheduleOutput {
  nextReviewAt: number;
  stability: number | null;
  difficulty: number | null;
  lastReviewedAt: number | null;
}

export interface CoreClient extends HybridObject<{ ios: 'c++', android: 'c++' }> {
  initializeReviewSchedule(
    input: InitializeReviewScheduleInput
  ): InitializeReviewScheduleOutput;
}
```

### C++ shim

```cpp
InitializeReviewScheduleOutput HybridCoreClient::initializeReviewSchedule(
  const InitializeReviewScheduleInput& input
) {
  RustInitReviewInput rustInput{
    .created_at = static_cast<int64_t>(input.createdAt),
    .interval_ms = input.intervalMs.has_value()
      ? RustOptionalI64{true, static_cast<int64_t>(*input.intervalMs)}
      : RustOptionalI64{false, 0},
  };

  auto rustOutput = rust_initialize_review_schedule(client_handle_, rustInput);
  return InitializeReviewScheduleOutput{
    .nextReviewAt = static_cast<double>(rustOutput.next_review_at),
    .stability = rustOutput.has_stability ? std::optional<double>(rustOutput.stability) : std::nullopt,
    .difficulty = rustOutput.has_difficulty ? std::optional<double>(rustOutput.difficulty) : std::nullopt,
    .lastReviewedAt = rustOutput.has_last_reviewed_at
      ? std::optional<double>(rustOutput.last_reviewed_at)
      : std::nullopt,
  };
}
```

### Rust transport and domain

```rust
#[repr(C)]
pub struct RustInitReviewInput {
    pub created_at: i64,
    pub interval_ms: RustOptionalI64,
}

pub extern "C" fn rust_initialize_review_schedule(
    client: ClientHandle,
    input: RustInitReviewInput,
) -> RustInitReviewOutput {
    let domain_input = InitializeReviewScheduleInput {
        created_at: input.created_at,
        interval_ms: input.interval_ms.into_option(),
    };

    let output = client.initialize_review_schedule(&domain_input);
    RustInitReviewOutput::from(output)
}
```

This example illustrates the rule: TypeScript owns the contract, C++ owns transport conversion, Rust owns semantics.

## Anti-Patterns

- Putting recommendation ranking logic into `HybridCoreClient.cpp`.
- Returning raw JSON strings from Rust to avoid defining transport structs.
- Letting desktop invent `snake_case` request names while mobile uses `camelCase`.
- Using `Partial<T>` patches at the FFI boundary without a documented tri-state clear/omit model.
- Loading every knowledge item into JS on app startup just to compute a small derived list.
- Exposing raw `rusqlite::Error` messages directly to the UI.

## API Review Checklist

- Is the new API defined in the TS spec first?
- Are all field names, nullability rules, and numeric semantics explicit?
- Does the API use only the allowed TS boundary subset?
- Is the API async if it can block or touch SQLite?
- Is there a clear Rust domain type for the payload?
- Is the C++ shim purely mechanical?
- Is the JS-visible error behavior documented?
- Does the API avoid unnecessary copies or full-table materialization?
- Is the API portable to desktop without changing semantics?
- Were generated files regenerated and documentation updated together?
