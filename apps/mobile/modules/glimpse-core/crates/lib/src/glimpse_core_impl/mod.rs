use rusqlite::Connection;

pub mod conversation;
pub mod knowledge;
pub mod recommendation;
pub mod review;
mod support;

pub use support::Context;
use support::open_database_or_panic;

pub struct GlimpseCore {
    #[allow(dead_code)]
    id: usize,
    conn: Connection,
}

impl GlimpseCore {
    pub(crate) fn new(ctx: Context) -> Self {
        let conn = open_database_or_panic(&ctx.data_path);
        Self { id: ctx.id, conn }
    }

}

pub(crate) use support::{
    parse_feedback_type, parse_json, parse_recommendation_status, to_i64, to_json, to_nullable_number,
    to_optional_i64,
};
