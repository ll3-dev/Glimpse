use crate::models::CalculateTagOverlapInput;

use super::{InitializeReviewScheduleInput, InitializeReviewScheduleOutput, SharedCore};

impl SharedCore {
    pub fn calculate_tag_overlap(&self, input: &CalculateTagOverlapInput) -> i32 {
        self.client().calculate_tag_overlap(input)
    }

    pub fn initialize_review_schedule(
        &self,
        input: &InitializeReviewScheduleInput,
    ) -> InitializeReviewScheduleOutput {
        self.client().initialize_review_schedule(input)
    }
}
