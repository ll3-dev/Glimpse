//! glimpse-bridge — rustra bridge commands over glimpse-core.
//!
//! Thin rustra `#[command]` wrappers around `glimpse_core::SharedCore`,
//! shared by the Tauri desktop shell and the React Native mobile bridge.

pub mod conversation;
pub mod error;
pub mod feedback;
pub mod io;
pub mod knowledge;
pub mod message;
pub mod recommendation;
pub mod review;
pub mod state;

pub use conversation::conversation_package;
pub use error::to_rustra_err;
pub use feedback::feedback_package;
pub use knowledge::knowledge_package;
pub use message::message_package;
pub use recommendation::recommendation_package;
pub use review::review_package;
pub use state::{core_state, init_core};

/// Assembles the flat `glimpse.core` package with ALL 25 domain commands.
///
/// Hosts that want a single registration surface (Tauri dispatch, mobile FFI)
/// use this; per-domain packages remain available for granular hosting.
pub fn glimpse_package() -> rustra::Package {
    static CACHED: std::sync::OnceLock<rustra::Package> = std::sync::OnceLock::new();
    CACHED
        .get_or_init(|| {
            rustra::Package::builder("glimpse.core")
                // Each domain registers its own commands (its `#[command]`
                // metadata consts are module-private, so registration must
                // happen inside the defining module).
                .pipe(conversation::register_commands)
                .pipe(feedback::register_commands)
                .pipe(knowledge::register_commands)
                .pipe(message::register_commands)
                .pipe(recommendation::register_commands)
                .pipe(review::register_commands)
                .build()
        })
        .clone()
}

/// Builder piping helper: applies `f` to `self` and returns the result.
trait Pipe: Sized {
    fn pipe<T>(self, f: impl FnOnce(Self) -> T) -> T {
        f(self)
    }
}

impl Pipe for rustra::PackageBuilder {}
