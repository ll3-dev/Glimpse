//! Error conversion from glimpse-core to rustra.

use rustra::RustraError;

/// Converts a `glimpse_core::Error` into a `rustra::RustraError`.
///
/// `NotFound` is surfaced as a `glimpse.not_found` custom code so callers can
/// distinguish missing records; `InvalidInput` maps to rustra's `invalid_args`;
/// everything else maps to the generic `internal`. Messages reuse thiserror's
/// Display formatting instead of duplicating it here.
pub fn to_rustra_err(error: glimpse_core::Error) -> RustraError {
    let message = error.to_string();
    match error {
        glimpse_core::Error::NotFound(..) => RustraError::custom("glimpse.not_found", message),
        glimpse_core::Error::InvalidInput(what) => RustraError::invalid_args(what),
        _ => RustraError::internal(message),
    }
}
