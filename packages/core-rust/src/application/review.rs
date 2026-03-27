use crate::models::{
    CalculateNextReviewInput, CalculateNextReviewOutput, CalculateTagOverlapInput,
};

use super::{InitializeReviewScheduleInput, InitializeReviewScheduleOutput, SharedCore};

impl SharedCore {
    pub fn calculate_tag_overlap(&self, input: &CalculateTagOverlapInput) -> i32 {
        self.client().calculate_tag_overlap(input)
    }

    pub fn calculate_next_review(
        &self,
        input: &CalculateNextReviewInput,
    ) -> CalculateNextReviewOutput {
        self.client().calculate_next_review(input)
    }

    pub fn initialize_review_schedule(
        &self,
        input: &InitializeReviewScheduleInput,
    ) -> InitializeReviewScheduleOutput {
        self.client().initialize_review_schedule(input)
    }
}
