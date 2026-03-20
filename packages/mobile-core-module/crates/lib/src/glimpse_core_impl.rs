use craby::{prelude::*, throw};
use glimpse_core_rs::{
    models::{KnowledgeItem, KnowledgeItemType},
    recommendation::calculate_tag_overlap,
    review::{calculate_initial_review_at, calculate_next_review, ReviewFeedbackType},
};

use crate::ffi::bridging::*;
use crate::generated::*;

pub struct GlimpseCore {
    ctx: Context,
}

fn to_i64(value: Number) -> i64 {
    value as i64
}

fn to_optional_i64(value: Nullable<Number>) -> Option<i64> {
    value.into_value().map(to_i64)
}

fn to_nullable_number(value: Option<i64>) -> NullableNumber {
    Nullable::new(value.map(|item| item as f64)).into()
}

fn to_knowledge_item(tags: Nullable<Array<String>>) -> KnowledgeItem {
    KnowledgeItem {
        id: String::new(),
        title: None,
        body: None,
        url: None,
        item_type: KnowledgeItemType::Note,
        tags: tags.into_value().unwrap_or_default(),
        created_at: None,
        last_reviewed_at: None,
        next_review_at: None,
    }
}

fn parse_feedback_type(value: &str) -> ReviewFeedbackType {
    match value {
        "remembered" => ReviewFeedbackType::Remembered,
        "postponed" => ReviewFeedbackType::Postponed,
        _ => throw!("Unsupported feedback type"),
    }
}

#[craby_module]
impl GlimpseCoreSpec for GlimpseCore {
    fn new(ctx: Context) -> Self {
        Self { ctx }
    }

    fn id(&self) -> usize {
        self.ctx.id
    }

    fn calculate_next_review(
        &mut self,
        last_reviewed_at: Nullable<Number>,
        next_review_at: Nullable<Number>,
        feedback_type: &str,
        now: Number,
    ) -> GlimpseCalculateNextReviewOutput {
        let next_review = calculate_next_review(
            to_optional_i64(last_reviewed_at),
            to_optional_i64(next_review_at),
            parse_feedback_type(feedback_type),
            to_i64(now),
        );

        GlimpseCalculateNextReviewOutput {
            interval_ms: next_review.interval_ms as f64,
            next_review_at: next_review.next_review_at as f64,
        }
    }

    fn calculate_tag_overlap(
        &mut self,
        left_tags: Nullable<Array<String>>,
        right_tags: Nullable<Array<String>>,
    ) -> Number {
        let left = to_knowledge_item(left_tags);
        let right = to_knowledge_item(right_tags);
        calculate_tag_overlap(&left, &right) as f64
    }

    fn initialize_review_schedule(
        &mut self,
        created_at: Number,
        interval_ms: Nullable<Number>,
    ) -> GlimpseInitializeReviewScheduleOutput {
        GlimpseInitializeReviewScheduleOutput {
            next_review_at: calculate_initial_review_at(
                to_i64(created_at),
                to_optional_i64(interval_ms),
            ) as f64,
            stability: Nullable::new(None).into(),
            difficulty: Nullable::new(None).into(),
            last_reviewed_at: to_nullable_number(None),
        }
    }
}
