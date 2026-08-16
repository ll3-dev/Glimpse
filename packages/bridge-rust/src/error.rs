//! Error conversion from glimpse-core to rustra.

use rustra::RustraError;

/// Converts a `glimpse_core::Error` into a `rustra::RustraError`.
///
/// `NotFound` is surfaced as a `glimpse.not_found` custom code so callers can
/// distinguish missing records from internal failures; everything else maps to
/// rustra's generic `internal`.
pub fn to_rustra_err(error: glimpse_core::Error) -> RustraError {
    match error {
        glimpse_core::Error::NotFound(what, id) => {
            RustraError::custom("glimpse.not_found", format!("Record not found: {what} with id {id}"))
        }
        other => RustraError::internal(other.to_string()),
    }
}
