//! Wire (camelCase) IO models mirroring `glimpse_core` models.
//!
//! Contract rules:
//! - Every struct derives `Debug, Clone, Serialize, Deserialize, JsonSchema`
//!   and renames fields to camelCase to match the `@glimpse/shared` TS types.
//! - Enum-typed fields cross the bridge as plain strings — core enums are
//!   `#[serde(rename_all = "lowercase")]`, so strings round-trip back into the
//!   core enums via serde.
//! - Tristate patch fields (`NullablePatch<T>` in core) are modeled as
//!   `Option<serde_json::Value>`: `None` = unset, `Some(Value::Null)` =
//!   explicit null, `Some(v)` = value. See [`NullableValue`].
//!
//! Conversion strictness: wire → core conversions are write paths and reject
//! malformed values with [`RustraError::invalid_args`] (wrong-typed patch
//! values, unknown enum strings) instead of silently nulling fields or
//! falling back to a default enum. Core → wire conversions are read paths and
//! stay infallible: core enums serialize to their known wire strings.
//!
//! Naming: model mirrors are `XxxIo`; command envelopes are bare
//! `XxxInput`/`XxxOutput` (defined next to their `#[command]`s).
//!
//! Submodules split per domain (`knowledge`, `conversation`, `message`,
//! `recommendation_feedback`, `review`); everything is re-exported here so
//! `use crate::io::Xxx` keeps working for consumers.

mod conversation;
mod knowledge;
mod message;
mod recommendation_feedback;
mod review;

pub use conversation::{ConversationIo, ConversationPatchIo};
pub use knowledge::{KnowledgeItemIo, KnowledgeItemPatchIo};
pub use message::{MessageIo, MessagePatchIo};
pub(crate) use recommendation_feedback::recommendation_status_from_wire;
pub use recommendation_feedback::{FeedbackEventIo, GraphAnalysisRecordIo, RecommendationIo};
pub use review::{
    CalculateTagOverlapInputIo, CoreKnowledgeItemLikeIo, InitializeReviewScheduleInputIo,
    InitializeReviewScheduleOutputIo,
};

use glimpse_core::NullablePatch;
use rustra::RustraError;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// JSON tristate for `NullablePatch<T>` fields.
///
/// `None` → [`NullablePatch::Unset`], `Some(Value::Null)` → [`NullablePatch::Null`],
/// `Some(v)` → [`NullablePatch::Value`] with `v` deserialized into `T`.
pub type NullableValue = Option<Value>;

/// Converts a wire tristate into a core [`NullablePatch`], rejecting malformed values.
///
/// The generated TS types model patch fields as `unknown`, so this is the last
/// line of defense: a `Some(v)` that fails to deserialize into `T` becomes an
/// `invalid_args` error naming `field` — never a silent [`NullablePatch::Null`]
/// (which storage would treat as "clear the column").
pub(crate) fn to_patch<T: for<'de> Deserialize<'de>>(
    field: &'static str,
    value: NullableValue,
) -> Result<NullablePatch<T>, RustraError> {
    match value {
        None => Ok(NullablePatch::Unset),
        Some(Value::Null) => Ok(NullablePatch::Null),
        Some(v) => serde_json::from_value::<T>(v)
            .map(NullablePatch::Value)
            .map_err(|err| {
                RustraError::invalid_args(format!("patch field `{field}` is invalid: {err}"))
            }),
    }
}

/// Serializes a core enum into its wire string.
///
/// Read path: core enums always serialize to their known wire strings; the
/// `unwrap_or(Value::Null)` only guards a hypothetical serialization failure.
pub(crate) fn enum_to_value<T: Serialize>(value: T) -> Value {
    serde_json::to_value(value).unwrap_or(Value::Null)
}

/// Parses a wire enum string on a write path, rejecting unknown values.
///
/// Unlike glimpse-core's own `str_to_*` helpers (which default unknown
/// strings), the bridge must not persist a fallback enum for a typo'd status —
/// `respondToRecommendation("accpeted")` fails loudly instead of writing
/// `pending`.
pub(crate) fn parse_enum<T: for<'de> Deserialize<'de>>(
    field: &'static str,
    value: String,
) -> Result<T, RustraError> {
    serde_json::from_value::<T>(Value::String(value)).map_err(|err| {
        RustraError::invalid_args(format!("field `{field}` has invalid enum value: {err}"))
    })
}
