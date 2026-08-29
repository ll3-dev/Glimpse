//! glimpse-bridge — rustra bridge commands over glimpse-core.
//!
//! Thin rustra `#[command]` wrappers around `glimpse_core::SharedCore`,
//! shared by the Tauri desktop shell and the React Native mobile bridge.

use rustra::ffi::FfiFormat;

pub mod conversation;
pub mod data;
pub mod error;
pub mod events;
pub mod feedback;
pub mod io;
pub mod knowledge;
pub mod message;
pub mod recommendation;
pub mod review;
pub mod state;

pub use conversation::conversation_package;
pub use data::data_package;
pub use error::to_rustra_err;
pub use events::{
    emit_llm_done, emit_llm_token, emit_model_download_done, emit_model_download_failed,
    emit_model_download_progress, register_event_contracts, DownloadDonePayload,
    DownloadFailedPayload, DownloadProgressPayload, StreamDonePayload, StreamTokenPayload,
    DOWNLOAD_DONE_EVENT, DOWNLOAD_FAILED_EVENT, DOWNLOAD_PROGRESS_EVENT, STREAM_DONE_EVENT,
    STREAM_TOKEN_EVENT,
};
pub use feedback::feedback_package;
pub use knowledge::knowledge_package;
pub use message::message_package;
pub use recommendation::recommendation_package;
pub use review::review_package;
pub use state::{core_state, init_core, initialize_core, reset_core};

/// Assembles the flat `glimpse.core` package with every shared domain command.
///
/// Hosts that want a single registration surface (Tauri dispatch, mobile FFI)
/// use this; per-domain packages remain available for granular hosting.
pub fn glimpse_package() -> rustra::Package {
    static CACHED: std::sync::OnceLock<rustra::Package> = std::sync::OnceLock::new();
    CACHED
        .get_or_init(|| {
            let pkg = rustra::Package::builder("glimpse.core")
                // Each domain registers its own commands (its `#[command]`
                // metadata consts are module-private, so registration must
                // happen inside the defining module).
                .pipe(conversation::register_commands)
                .pipe(data::register_commands)
                .pipe(feedback::register_commands)
                .pipe(knowledge::register_commands)
                .pipe(message::register_commands)
                .pipe(recommendation::register_commands)
                .pipe(review::register_commands)
                .pipe(state::register_commands)
                // (이벤트 계약) LLM 스트리밍/모델 다운로드 이벤트 — payload
                // 타입을 schema.json `events` 섹션 + 계약 해시에 포함시켜
                // 코드젠 산출물이 이벤트 와이어도 커버하게 한다.
                .pipe(events::register_event_contracts)
                .build();

            // Expose the generic rustra FFI symbols (`rustra_ffi_invoke_json`,
            // ...) from this crate's staticlib. JSON default matches the
            // mobile JSI bridge wire format. Independent of the Tauri
            // `rustra_dispatch` path, which invokes the package directly.
            pkg.register_ffi_with_default(FfiFormat::Json);

            pkg
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

// ── Staticlib self-registration on load ────────────────────
// Apple targets get a `__DATA,__mod_init_func` constructor so the staticlib
// registers itself with the rustra FFI globals when linked into the app —
// generic FFI calls work without any prior glimpse-specific call.
#[cfg(target_vendor = "apple")]
mod apple_init {
    extern "C" fn rustra_auto_init() {
        super::glimpse_package();
    }

    #[used]
    #[unsafe(link_section = "__DATA,__mod_init_func")]
    static AUTO_INIT: extern "C" fn() = rustra_auto_init;
}

/// C entry point: idempotently register `glimpse.core` for FFI.
///
/// Deterministic fallback for platforms without a loader-run constructor
/// section (Android), and for iOS debug builds where the `__mod_init_func`
/// constructor can be dead-stripped — the JSI install() should call this.
#[unsafe(no_mangle)]
pub extern "C" fn glimpse_ffi_init() {
    let _ = glimpse_package();
}
