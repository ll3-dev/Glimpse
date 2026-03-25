# Nitro Mobile Bridge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Nitro-based mobile bridge to connect TypeScript to Rust core via thin C++ shim, replacing the current TypeScript local adapter with Rust-backed SQLite storage.

 enhancing performance and type safety, and enabling desktop reuse of the same Rust core.

**Architecture:** TypeScript Nitro spec as SSOT → Nitrogen generates native bindings → thin C++ shim handles FFI conversion → Rust core manages business logic and SQLite. The mobile app will access Rust through Nitro modules ( while desktop will use a separate Tauri adapter to to same Rust core.

**Tech Stack:**
- Nitro Modules (react-native-nitro-modules)
- Nitrogen (code generation)
- C++17 (FFI shim layer)
- Rust (glimpse-core crate)
- SQLite via rusqlite
- TypeScript (TypeScript spec)

---

## Current State

- **Completed**: Rust core with SQLite storage (`packages/core-rust`)
- **Completed**: TypeScript models in `packages/shared/src/index.ts`
- **Current**: Mobile uses TypeScript local adapter (`apps/mobile/src/features/core/local-core-client.ts`)
- **Current**: Desktop uses separate Tauri commands (`apps/desktop/src-tauri/src/commands.rs`)
- **Gap**: No Nitro bridge, no C++ shim, no FFI layer

## What This Plan Implements

1. **Phase 1: TypeScript Spec as SSOT** - Create canonical Nitro spec
2. **Phase 2: FFI Layer in Rust** - Add bridge-facing transport types and FFI entrypoints
3. **Phase 3: C++ Shim Implementation** - Thin C++ layer for type conversion
4. **Phase 4: Nitrogen Code Generation** - Generate Nitro bindings
5. **Phase 5: Mobile Integration** - Wire up mobile app to use Nitro bridge
6. **Phase 6: Testing & Validation** - Comprehensive testing

---

## Phase 1: TypeScript Spec as SSOT

### Task 1: Create specs package structure

**Files:**
- Create: `packages/specs/package.json`
- Create: `packages/specs/tsconfig.json`
- Create: `packages/specs/src/index.ts`

**Step 1: Create specs package.json**

```json
{
  "name": "@glimpse/specs",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react-native-nitro-modules": "^0.25.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0"
  }
}
```

**Step 2: Create specs tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@glimpse/shared": ["../../packages/shared/src"],
      "@glimpse/specs": ["./src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create specs index.ts with re-exports**

```typescript
// packages/specs/src/index.ts
export * from './core/types';
export * from './core/errors';
export * from './core/CoreClient.nitro';
```

**Step 4: Commit**

```bash
git add packages/specs/
git commit -m "feat(specs): add specs package for Nitro bridge contract"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Task 2: Define bridge error types

**Files:**
- Create: `packages/specs/src/core/errors.ts`

**Step 1: Write CoreBridgeError interface**

```typescript
// packages/specs/src/core/errors.ts
/**
 * Normalized error shape for JS-visible bridge errors.
 * Matches the architecture document's error boundary design.
 */
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

/**
 * Maps Rust Error enum to bridge error code.
 */
export function mapRustErrorToCode(rustError: string): CoreBridgeError['code'] {
  if (rustError.includes('InvalidInput')) return 'INVALID_INPUT';
  if (rustError.includes('NotFound')) return 'NOT_FOUND';
  if (rustError.includes('Conflict')) return 'CONFLICT';
  if (rustError.includes('Database')) return 'DATABASE';
  if (rustError.includes('Timeout')) return 'TIMEOUT';
  return 'INTERNAL';
}
```

**Step 2: Commit**

```bash
git add packages/specs/src/core/errors.ts
git commit -m "feat(specs): add CoreBridgeError type for normalized bridge errors"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Task 3: Define bridge transport types

**Files:**
- Create: `packages/specs/src/core/types.ts`

**Step 1: Write bridge transport types**

```typescript
// packages/specs/src/core/types.ts
import type { KnowledgeItem } from '@glimpse/shared';

/**
 * Bridge transport types - FFI-safe versions of * Only what crosses the bridge boundary.
 * These are intentionally limited to the allowed subset per architecture doc.
 */

// Re-export shared types that are already bridge-compatible
export type {
  KnowledgeItem,
  KnowledgeItemType,
  KnowledgeItemLabelStatus,
  KnowledgeItemLabelSource,
  Recommendation,
  RecommendationStatus,
  FeedbackEvent,
  FeedbackActionType,
  Conversation,
  Message,
  MessageRole,
  ReviewFeedbackType,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
  GetDueKnowledgeItemsInput,
} from '@glimpse/shared';

/**
 * Bridge-specific input types with explicit nullability
 * Using snake_case for FFI compatibility as per architecture doc.
 */
export interface BridgeCalculateTagOverlapInput {
  left_tags: string[] | null;
  right_tags: string[] | null;
}

export interface BridgeCalculateNextReviewInput {
  last_reviewed_at: number | null;
  next_review_at: number | null;
  feedback_type: ReviewFeedbackType;
  now: number;
}

export interface BridgeKnowledgeItemPatch {
  item_type?: KnowledgeItemType;
  title?: string | null;
  body?: string | null;
  url?: string | null;
  summary?: string | null;
  tags?: string[] | null;
  labels?: string[] | null;
  provisional_labels?: string[] | null;
  label_status?: KnowledgeItemLabelStatus | null;
  label_source?: KnowledgeItemLabelSource | null;
  label_version?: string | null;
  label_score?: number | null;
  label_requested_at?: number | null;
  label_completed_at?: number | null;
  label_error?: string | null;
  updated_at?: number;
  stability?: number | null;
  difficulty?: number | null;
  last_reviewed_at?: number | null;
  next_review_at?: number | null;
}

export interface BridgeConversationPatch {
  title?: string | null;
  icon?: string | null;
  context_item_id?: string | null;
  updated_at?: number;
  deleted_at?: number | null;
}

export interface BridgeMessagePatch {
  content?: string;
  updated_at?: number;
  deleted_at?: number | null;
}

export interface BridgeRecommendationPatch {
  reason?: string | null;
  status?: RecommendationStatus;
  responded_at?: number | null;
}
```

**Step 2: Commit**

```bash
git add packages/specs/src/core/types.ts
git commit -m "feat(specs): add bridge transport types for FFI boundary"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Task 4: Create CoreClient Nitro spec

**Files:**
- Create: `packages/specs/src/core/CoreClient.nitro.ts`

**Step 1: Write CoreClient Nitro spec**

```typescript
// packages/specs/src/core/CoreClient.nitro.ts
import type { HybridObject } from 'react-native-nitro-modules';
import type {
  KnowledgeItem,
  Recommendation,
  FeedbackEvent,
  Conversation,
  Message,
  InitializeReviewScheduleInput,
  InitializeReviewScheduleOutput,
  GetDueKnowledgeItemsInput,
} from '@glimpse/shared';
import type {
  BridgeCalculateTagOverlapInput,
  BridgeCalculateNextReviewInput,
  BridgeKnowledgeItemPatch,
  BridgeConversationPatch,
  BridgeMessagePatch,
  BridgeRecommendationPatch,
} from './types';
import type { CoreBridgeError } from './errors';

/**
 * CoreClient Nitro Spec - Canonical API contract
 * This is the single source of truth for the mobile bridge API.
 * All methods that touch SQLite are async from JS perspective.
 */
export interface CoreClient extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  // Lifecycle
  initialize(dbPath: string): Promise<void>;

  // Synchronous calculations (pure functions, no SQLite)
  calculateTagOverlap(input: BridgeCalculateTagOverlapInput): number;
  calculateNextReview(input: BridgeCalculateNextReviewInput): { interval_ms: number; next_review_at: number };
  initializeReviewSchedule(input: InitializeReviewScheduleInput): InitializeReviewScheduleOutput;

  // Async CRUD - Knowledge Items
  saveKnowledgeItem(item: KnowledgeItem): Promise<KnowledgeItem>;
  listKnowledgeItems(): Promise<KnowledgeItem[]>;
  listKnowledgeItemsByIds(itemIds: string[]): Promise<KnowledgeItem[]>;
  listWeeklyKnowledgeItems(since: number): Promise<KnowledgeItem[]>;
  listPendingKnowledgeItemsForLabeling(limit: number): Promise<KnowledgeItem[]>;
  getKnowledgeItemById(itemId: string): Promise<KnowledgeItem | null>;
  getDueKnowledgeItems(input: GetDueKnowledgeItemsInput): Promise<KnowledgeItem[]>;
  updateKnowledgeItem(itemId: string, patch: BridgeKnowledgeItemPatch): Promise<KnowledgeItem>;

  // Async CRUD - Conversations
  createConversation(conversation: Conversation): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  updateConversation(conversationId: string, patch: BridgeConversationPatch): Promise<Conversation>;
  deleteConversation(conversationId: string, deletedAt: number): Promise<void>;

  // Async CRUD - Messages
  listConversationMessages(conversationId: string): Promise<Message[]>;
  addMessage(message: Message): Promise<Message>;
  updateMessage(messageId: string, patch: BridgeMessagePatch): Promise<Message>;
  deleteMessage(messageId: string, deletedAt: number): Promise<void>;

  // Async CRUD - Recommendations
  saveRecommendations(recommendations: Recommendation[]): Promise<void>;
  listRecommendations(): Promise<Recommendation[]>;
  listPendingRecommendations(): Promise<Recommendation[]>;
  respondToRecommendation(
    recommendationId: string,
    status: RecommendationStatus,
    feedbackEvent: FeedbackEvent
  ): Promise<void>;

  // Async CRUD - Feedback Events
  listRecentFeedbackEvents(limit: number): Promise<FeedbackEvent[]>;
  logRecommendationFeedback(event: FeedbackEvent): Promise<FeedbackEvent>;
}
```

**Step 2: Commit**

```bash
git add packages/specs/src/core/CoreClient.nitro.ts
git commit -m "feat(specs): add CoreClient Nitro spec as canonical API contract"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Phase 2: FFI Layer in Rust

### Task 5: Add FFI module structure

**Files:**
- Create: `packages/core-rust/src/ffi/mod.rs`
- Create: `packages/core-rust/src/ffi/types.rs`
- Create: `packages/core-rust/src/ffi/error.rs`

**Step 1: Create FFI module file**

```rust
// packages/core-rust/src/ffi/mod.rs
//! FFI (Foreign Function Interface) layer for C++ bridge.
//!
//! This module contains FFI-safe types and functions that can be called from C++.
//! All types here are `#[repr(C)]` and use C-compatible layouts.

mod error;
mod types;

pub use error::*;
pub use types::*;

use crate::CoreClientImpl;
use std::ffi::{c_char, c_int, CStr, CString};
use std::ptr;

/// Opaque handle to a CoreClient instance.
/// C++ holds this and passes it back to FFI calls.
pub type CoreClientHandle = *mut CoreClientImpl;

/// Creates a new CoreClient with SQLite storage at the given path.
/// Returns null on error.
///
/// # Safety
/// - db_path must be a valid null-terminated UTF-8 string
/// - Caller must eventually call core_client_destroy to free the handle
#[no_mangle]
pub unsafe extern "C" fn core_client_create(db_path: *const c_char) -> CoreClientHandle {
    let path = match CStr::from_ptr(db_path).to_str() {
        Ok(s) => s,
        Err(_) => return ptr::null_mut(),
    };

    match crate::storage::sqlite::SqliteStorage::new(path) {
        Ok(storage) => {
            let client = Box::new(CoreClientImpl::new(storage));
            Box::into_raw(client)
        }
        Err(_) => ptr::null_mut(),
    }
}

/// Destroys a CoreClient handle.
///
/// # Safety
/// - handle must be a valid pointer returned by core_client_create
/// - handle must not be used after this call
#[no_mangle]
pub unsafe extern "C" fn core_client_destroy(handle: CoreClientHandle) {
    if !handle.is_null() {
        drop(Box::from_raw(handle));
    }
}

/// Returns the last error message for the current thread.
/// Used for debugging when FFI calls return error codes.
///
/// # Safety
/// - buffer must be valid for buffer_len bytes
/// - Returns the number of bytes written (excluding null terminator)
#[no_mangle]
pub unsafe extern "C" fn core_client_get_last_error(buffer: *mut c_char, buffer_len: c_int) -> c_int {
    // TODO: Implement thread-local error storage for better error messages
    0
}
```

**Step 2: Create FFI types file**

```rust
// packages/core-rust/src/ffi/types.rs
//! FFI-safe type definitions for bridge transport.

use std::ffi::{c_char, c_int};

/// FFI-safe optional i64 value.
#[repr(C)]
pub struct FfiOptionalI64 {
    pub has_value: bool,
    pub value: i64,
}

impl From<Option<i64>> for FfiOptionalI64 {
    fn from(opt: Option<i64>) -> Self {
        match opt {
            Some(v) => Self { has_value: true, value: v },
            None => Self { has_value: false, value: 0 },
        }
    }
}

impl From<FfiOptionalI64> for Option<i64> {
    fn from(ffi: FfiOptionalI64) -> Self {
        if ffi.has_value { Some(ffi.value) } else { None }
    }
}

/// FFI-safe optional f64 value.
#[repr(C)]
pub struct FfiOptionalF64 {
    pub has_value: bool,
    pub value: f64,
}

impl From<Option<f64>> for FfiOptionalF64 {
    fn from(opt: Option<f64>) -> Self {
        match opt {
            Some(v) => Self { has_value: true, value: v },
            None => Self { has_value: false, value: 0.0 },
        }
    }
}

impl From<FfiOptionalF64> for Option<f64> {
    fn from(ffi: FfiOptionalF64) -> Self {
        if ffi.has_value { Some(ffi.value) } else { None }
    }
}

/// FFI-safe string pointer with length.
/// Caller owns the allocation and must free it with ffi_string_free.
#[repr(C)]
pub struct FfiString {
    pub data: *mut c_char,
    pub len: c_int,
}

/// FFI-safe string array.
#[repr(C)]
pub struct FfiStringArray {
    pub data: *mut *mut c_char,
    pub len: c_int,
}

/// FFI-safe result type for operations that return an item or null.
#[repr(C)]
pub struct FfiNullableItem {
    pub found: bool,
    pub error_code: c_int,
}

/// FFI error codes matching CoreBridgeError codes.
#[repr(C)]
pub enum FfiErrorCode {
    Ok = 0,
    InvalidInput = 1,
    NotFound = 2,
    Conflict = 3,
    Database = 4,
    Timeout = 5,
    Cancelled = 6,
    Internal = 7,
}

impl From<&crate::Error> for FfiErrorCode {
    fn from(err: &crate::Error) -> Self {
        match err {
            crate::Error::InvalidInput(_) => Self::InvalidInput,
            crate::Error::NotFound(_, _) => Self::NotFound,
            crate::Error::Database(_) => Self::Database,
            crate::Error::Serialization(_) => Self::Internal,
        }
    }
}
```

**Step 3: Create FFI error file**

```rust
// packages/core-rust/src/ffi/error.rs
//! FFI error handling utilities.

use super::FfiErrorCode;
use std::ffi::c_int;

/// Converts a Rust Result to FFI error code.
pub fn result_to_ffi_code<T, E: std::fmt::Display>(result: &Result<T, E>) -> (FfiErrorCode, c_int) {
    match result {
        Ok(_) => (FfiErrorCode::Ok, 0),
        Err(e) => {
            let code = match e.to_string().as_str() {
                s if s.contains("InvalidInput") => FfiErrorCode::InvalidInput,
                s if s.contains("NotFound") => FfiErrorCode::NotFound,
                s if s.contains("Database") => FfiErrorCode::Database,
                _ => FfiErrorCode::Internal,
            };
            (code, code as c_int)
        }
    }
}
```

**Step 4: Update lib.rs to export FFI module**

```rust
// packages/core-rust/src/lib.rs (add ffi module)
pub mod core_client;
mod error;
pub mod ffi;  // Add this line
mod models;
mod storage;

pub use core_client::CoreClientImpl;
pub use error::Error;
pub use ffi::{CoreClientHandle, FfiErrorCode};
pub use models::*;
pub use storage::sqlite::SqliteStorage;
```

**Step 5: Commit**

```bash
git add packages/core-rust/src/ffi/ packages/core-rust/src/lib.rs
git commit -m "feat(core-rust): add FFI layer for C++ bridge"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Task 6: Add FFI sync functions

**Files:**
- Create: `packages/core-rust/src/ffi/sync.rs`

**Step 1: Write FFI sync functions**

```rust
// packages/core-rust/src/ffi/sync.rs
//! Synchronous FFI functions - pure calculations, no SQLite access.

use super::{CoreClientHandle, FfiOptionalI64, FfiErrorCode};
use crate::core_client::CoreClientImpl;
use std::ffi::c_int;

/// Input for tag overlap calculation.
#[repr(C)]
pub struct FfiTagOverlapInput {
    pub left_tags: *mut *mut i8,
    pub left_tags_len: c_int,
    pub right_tags: *mut *mut i8,
    pub right_tags_len: c_int,
}

/// Output for next review calculation.
#[repr(C)]
pub struct FfiNextReviewOutput {
    pub interval_ms: i64,
    pub next_review_at: i64,
}

/// Output for initialize review schedule.
#[repr(C)]
pub struct FfiInitReviewOutput {
    pub next_review_at: i64,
    pub stability: FfiOptionalF64,
    pub difficulty: FfiOptionalF64,
    pub last_reviewed_at: FfiOptionalI64,
}

/// Calculates tag overlap between two sets of tags.
/// Returns the count of overlapping tags.
///
/// # Safety
/// - handle must be a valid CoreClientHandle
/// - left_tags and right_tags must be valid arrays of null-terminated strings
#[no_mangle]
pub unsafe extern "C" fn core_client_calculate_tag_overlap(
    _handle: CoreClientHandle,
    left_tags: *const *const i8,
    left_tags_len: c_int,
    right_tags: *const *const i8,
    right_tags_len: c_int,
) -> c_int {
    if left_tags.is_null() || right_tags.is_null() {
        return 0;
    }

    let left: std::collections::HashSet<String> = (0..left_tags_len)
        .filter_map(|i| {
            let ptr = *left_tags.offset(i as isize);
            if ptr.is_null() { return None; }
            CStr::from_ptr(ptr).to_str().ok().map(|s| s.to_string())
        })
        .collect();

    let right: std::collections::HashSet<String> = (0..right_tags_len)
        .filter_map(|i| {
            let ptr = *right_tags.offset(i as isize);
            if ptr.is_null() { return None; }
            CStr::from_ptr(ptr).to_str().ok().map(|s| s.to_string())
        })
        .collect();

    left.intersection(&right).count() as c_int
}

/// Calculates the next review time based on feedback.
///
/// # Safety
/// - handle must be a valid CoreClientHandle
#[no_mangle]
pub unsafe extern "C" fn core_client_calculate_next_review(
    handle: CoreClientHandle,
    last_reviewed_at: FfiOptionalI64,
    next_review_at: FfiOptionalI64,
    feedback_type: i8,  // 0 = remembered, 1 = postponed
    now: i64,
    out: *mut FfiNextReviewOutput,
) -> FfiErrorCode {
    if handle.is_null() || out.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let client = &*handle;
    let input = crate::models::CalculateNextReviewInput {
        last_reviewed_at: last_reviewed_at.into(),
        next_review_at: next_review_at.into(),
        feedback_type: if feedback_type == 0 {
            crate::models::ReviewFeedbackType::Remembered
        } else {
            crate::models::ReviewFeedbackType::Postponed
        },
        now,
    };

    match client.calculate_next_review(input) {
        Ok(result) => {
            (*out).interval_ms = result.interval_ms;
            (*out).next_review_at = result.next_review_at;
            FfiErrorCode::Ok
        }
        Err(e) => FfiErrorCode::from(&e)
    }
}

/// Initializes a review schedule for a new item.
///
/// # Safety
/// - handle must be a valid CoreClientHandle
#[no_mangle]
pub unsafe extern "C" fn core_client_initialize_review_schedule(
    handle: CoreClientHandle,
    created_at: i64,
    interval_ms: FfiOptionalI64,
    out: *mut FfiInitReviewOutput,
) -> FfiErrorCode {
    if handle.is_null() || out.is_null() {
        return FfiErrorCode::InvalidInput;
    }

    let client = &*handle;
    let input = crate::models::InitializeReviewScheduleInput {
        created_at,
        interval_ms: interval_ms.into(),
    };

    match client.initialize_review_schedule(input) {
        Ok(result) => {
            (*out).next_review_at = result.next_review_at;
            (*out).stability = result.stability.into();
            (*out).difficulty = result.difficulty.into();
            (*out).last_reviewed_at = result.last_reviewed_at.into();
            FfiErrorCode::Ok
        }
        Err(e) => FfiErrorCode::from(&e)
    }
}
```

**Step 2: Update ffi/mod.rs to export sync functions**

```rust
// Add to packages/core-rust/src/ffi/mod.rs
mod sync;
pub use sync::*;
```

**Step 3: Commit**

```bash
git add packages/core-rust/src/ffi/
git commit -m "feat(core-rust): add FFI sync calculation functions"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Phase 3: C++ Shim Implementation

### Task 7: Create C++ shim structure

**Files:**
- Create: `apps/mobile/src/features/core/native/HybridCoreClient.cpp`
- Create: `apps/mobile/src/features/core/native/rust_core.h`
- Create: `apps/mobile/src/features/core/native/CMakeLists.txt`

**Step 1: Create rust_core.h header**

```cpp
// apps/mobile/src/features/core/native/rust_core.h
#pragma once

#include <cstdint>
#include <memory>

#ifdef __cplusplus
extern "C" {
#endif

// Opaque handle to Rust CoreClient
using CoreClientHandle = void*;

// FFI types matching Rust definitions
struct FfiOptionalI64 {
    bool has_value;
    int64_t value;
};

struct FfiOptionalF64 {
    bool has_value;
    double value;
};

struct FfiNextReviewOutput {
    int64_t interval_ms;
    int64_t next_review_at;
};

struct FfiInitReviewOutput {
    int64_t next_review_at;
    FfiOptionalF64 stability;
    FfiOptionalF64 difficulty;
    FfiOptionalI64 last_reviewed_at;
};

enum FfiErrorCode {
    FfiOk = 0,
    FfiInvalidInput = 1,
    FfiNotFound = 2,
    FfiConflict = 3,
    FfiDatabase = 4,
    FfiTimeout = 5,
    FfiCancelled = 6,
    FfiInternal = 7,
};

// Lifecycle
CoreClientHandle core_client_create(const char* db_path);
void core_client_destroy(CoreClientHandle handle);

// Sync calculations
int32_t core_client_calculate_tag_overlap(
    CoreClientHandle handle,
    const char** left_tags,
    int32_t left_tags_len,
    const char** right_tags,
    int32_t right_tags_len
);

FfiErrorCode core_client_calculate_next_review(
    CoreClientHandle handle,
    FfiOptionalI64 last_reviewed_at,
    FfiOptionalI64 next_review_at,
    int8_t feedback_type,
    int64_t now,
    FfiNextReviewOutput* out
);

FfiErrorCode core_client_initialize_review_schedule(
    CoreClientHandle handle,
    int64_t created_at,
    FfiOptionalI64 interval_ms,
    FfiInitReviewOutput* out
);

// Async operations - these will be called on background thread
// ... (more declarations for async operations)

#ifdef __cplusplus
}
#endif
```

**Step 2: Commit**

```bash
git add apps/mobile/src/features/core/native/rust_core.h
git commit -m "feat(mobile): add Rust FFI header for C++ shim"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Task 8: Implement HybridCoreClient.cpp

**Files:**
- Create: `apps/mobile/src/features/core/native/HybridCoreClient.cpp`

**Step 1: Write HybridCoreClient implementation**

```cpp
// apps/mobile/src/features/core/native/HybridCoreClient.cpp
#include "HybridCoreClient.hpp"
#include "rust_core.h"
#include <algorithm>
#include <stdexcept>

namespace glimpse::core {

HybridCoreClient::HybridCoreClient(const std::string& dbPath)
    : dbPath_(dbPath), handle_(nullptr) {
    handle_ = core_client_create(dbPath.c_str());
    if (!handle_) {
        throw std::runtime_error("Failed to create Rust CoreClient");
    }
}

HybridCoreClient::~HybridCoreClient() {
    if (handle_) {
        core_client_destroy(handle_);
        handle_ = nullptr;
    }
}

// Sync calculations - no async dispatch needed

double HybridCoreClient::calculateTagOverlap(
    const std::optional<std::vector<std::string>>& leftTags,
    const std::optional<std::vector<std::string>>& rightTags
) {
    std::vector<const char*> leftPtrs;
    std::vector<const char*> rightPtrs;

    if (leftTags) {
        for (const auto& tag : *leftTags) {
            leftPtrs.push_back(tag.c_str());
        }
    }

    if (rightTags) {
        for (const auto& tag : *rightTags) {
            rightPtrs.push_back(tag.c_str());
        }
    }

    return core_client_calculate_tag_overlap(
        handle_,
        leftPtrs.data(),
        static_cast<int32_t>(leftPtrs.size()),
        rightPtrs.data(),
        static_cast<int32_t>(rightPtrs.size())
    );
}

// ... more implementation
} // namespace glimpse::core
```

**Step 2: Commit**

```bash
git add apps/mobile/src/features/core/native/HybridCoreClient.cpp
git commit -m "feat(mobile): implement HybridCoreClient C++ shim"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Phase 4: Nitrogen Code Generation

### Task 9: Configure Nitrogen

**Files:**
- Create: `apps/mobile/nitrogen.json`

**Step 1: Create Nitrogen config**

```json
{
  "specs": [
    {
      "file": "./src/features/core/native/CoreClient.nitro.ts",
      "namespace": "GlimpseCore"
    }
  ],
  "cpp": {
    "outputDir": "./src/features/core/native/generated",
    "namespace": "glimpse::core"
  },
  "autogenerate": {
    "c++": true,
    "kotlin": true,
    "swift": true
  }
}
```

**Step 2: Commit**

```bash
git add apps/mobile/nitrogen.json
git commit -m "feat(mobile): add Nitrogen config for CoreClient"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Task 10: Run Nitrogen codegen

**Step 1: Install Nitrogen CLI**

```bash
cd apps/mobile && bun add -D @margin/nitrogen-cli
```

**Step 2: Run Nitrogen codegen**

```bash
bun run nitrogen generate
```

**Expected output:** Generated files in `apps/mobile/src/features/core/native/generated/`

**Step 3: Commit**

```bash
git add apps/mobile/src/features/core/native/generated/
git commit -m "feat(mobile): generate Nitro bindings with Nitrogen"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Phase 5: Mobile Integration

### Task 11: Update mobile tsconfig paths

**Files:**
- Modify: `apps/mobile/tsconfig.json`

**Step 1: Fix @glimpse/core path alias**

```json
{
  "compilerOptions": {
    "paths": {
      "@glimpse/shared": ["../../packages/shared/src"],
      "@glimpse/specs": ["../../packages/specs/src"],
      "@glimpse/core": ["../../packages/specs/src/core"]
    }
  }
}
```

**Step 2: Commit**

```bash
git add apps/mobile/tsconfig.json
git commit -m "fix(mobile): update tsconfig paths to use specs package"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Task 12: Update native-core-client to use Nitro

**Files:**
- Modify: `apps/mobile/src/features/core/native-core-client.native.ts`

**Step 1: Replace local adapter with Nitro module**

```typescript
// apps/mobile/src/features/core/native-core-client.native.ts
import { NitroModules } from 'react-native-nitro-modules';
import type { CoreClient } from '@glimpse/specs';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

let _coreClient: CoreClient | null = null;

async function getDbPath(): Promise<string> {
  const dbDir = Platform.select({
    ios: () => RNFS.DocumentDirectoryPath,
    android: () => RNFS.DocumentDirectoryPath,
    default: () => RNFS.DocumentDirectoryPath,
  })();
  return `${dbDir}/glimpse.db`;
}

export async function getNativeCoreClient(): Promise<CoreClient> {
  if (!_coreClient) {
    _coreClient = NitroModules.createHybridObject<CoreClient>('CoreClient');
    const dbPath = await getDbPath();
    await _coreClient.initialize(dbPath);
  }
  return _coreClient;
}

// For sync access (legacy compatibility)
export function getNativeCoreClientSync(): CoreClient | null {
  return _coreClient;
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/features/core/native-core-client.native.ts
git commit -m "feat(mobile): integrate Nitro CoreClient for native bridge"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Task 13: Update mobile-core-client adapter

**Files:**
- Modify: `apps/mobile/src/features/core/mobile-core-client.ts`

**Step 1: Update to use Nitro client**

```typescript
// apps/mobile/src/features/core/mobile-core-client.ts
import type { MobileCoreClient } from './types';
import { getNativeCoreClient } from './native-core-client.native';

export const mobileCoreClient: MobileCoreClient = {
  // Sync methods
  calculateTagOverlap: async (input) => {
    const client = await getNativeCoreClient();
    return client.calculateTagOverlap({
      left_tags: input.left.tags ?? null,
      right_tags: input.right.tags ?? null,
    });
  },

  calculateNextReview: async (input) => {
    const client = await getNativeCoreClient();
    return client.calculateNextReview({
      last_reviewed_at: input.lastReviewedAt ?? null,
      next_review_at: input.nextReviewAt ?? null,
      feedback_type: input.feedbackType,
      now: input.now,
    });
  },

  initializeReviewSchedule: async (input) => {
    const client = await getNativeCoreClient();
    return client.initializeReviewSchedule(input);
  },

  // Async methods
  saveKnowledgeItem: async (item) => {
    const client = await getNativeCoreClient();
    return client.saveKnowledgeItem(item);
  },

  // ... remaining methods
};
```

**Step 2: Commit**

```bash
git add apps/mobile/src/features/core/mobile-core-client.ts
git commit -m "feat(mobile): update MobileCoreClient to use Nitro bridge"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## Phase 6: Testing & Validation

### Task 14: Write FFI unit tests

**Files:**
- Create: `packages/core-rust/src/ffi/tests.rs`

**Step 1: Write FFI tests**

```rust
// packages/core-rust/src/ffi/tests.rs
#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::CString;
    use tempfile::NamedTempFile;

    fn create_test_client() -> *mut CoreClientImpl {
        let temp = NamedTempFile::new().unwrap();
        let path = CString::new(temp.path().to_str().unwrap()).unwrap();
        unsafe { core_client_create(path.as_ptr()) }
    }

    #[test]
    fn test_ffi_create_and_destroy() {
        let handle = create_test_client();
        assert!(!handle.is_null());
        unsafe { core_client_destroy(handle) };
    }

    #[test]
    fn test_ffi_calculate_tag_overlap() {
        let handle = create_test_client();
        let left = vec![CString::new("rust").unwrap(), CString::new("react").unwrap()];
        let right = vec![CString::new("rust").unwrap(), CString::new("vue").unwrap()];

        let left_ptrs: Vec<*const i8> = left.iter().map(|s| s.as_ptr()).collect();
        let right_ptrs: Vec<*const i8> = right.iter().map(|s| s.as_ptr()).collect();

        let result = unsafe {
            core_client_calculate_tag_overlap(
                handle,
                left_ptrs.as_ptr(),
                left_ptrs.len() as i32,
                right_ptrs.as_ptr(),
                right_ptrs.len() as i32,
            )
        };

        assert_eq!(result, 1); // "rust" overlaps

        unsafe { core_client_destroy(handle) };
    }
}
```

**Step 2: Commit**

```bash
git add packages/core-rust/src/ffi/tests.rs
git commit -m "test(core-rust): add FFI unit tests"
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Task 15: Run all tests

**Step 1: Run Rust tests**

```bash
cargo test --package glimpse-core
```

**Expected:** All tests pass including new FFI tests.

**Step 2: Run mobile lint**

```bash
cd apps/mobile && bun run lint
```

**Expected:** No errors.

**Step 3: Run type check**

```bash
cd apps/mobile && bun run typecheck
```

**Expected:** No errors.

---

## Verification Checklist

### Automatic Verification
- [ ] Rust tests pass: `cargo test --package glimpse-core`
- [ ] Mobile lint passes: `bun run lint`
- [ ] Mobile typecheck passes: `bun run typecheck`
- [ ] iOS build succeeds: `bun run ios`
- [ ] Android build succeeds: `bun run android`

### Manual Verification
- [ ] App launches without errors
- [ ] Knowledge items can be saved and retrieved
- [ ] Conversations and messages work
- [ ] Recommendations and feedback work
- [ ] Review schedule calculations are correct
- [ ] No regression from existing TypeScript adapter

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Nitro API changes | Pin version, test thoroughly |
| C++ build complexity | Follow Nitro templates, add CI |
| Type drift between TS/Rust | Keep specs package as SSOT |
| SQLite threading | All Rust access from background thread |
| Data migration | Not in scope - clean start only |

## Scope Exclusions

- Data migration from MMKV to SQLite
- Desktop Tauri integration (separate plan)
- Web platform support
- Long-running operation cancellation
