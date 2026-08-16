//! Review scheduling rustra commands over `SharedCore`.
//!
//! These are pure calculations — they don't touch storage.

use rustra::prelude::*;

use crate::io::{
    CalculateNextReviewInputIo, CalculateNextReviewOutputIo, CalculateTagOverlapInputIo,
    InitializeReviewScheduleInputIo, InitializeReviewScheduleOutputIo,
};

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CalculateTagOverlapIoInput {
    #[serde(flatten)]
    pub input: CalculateTagOverlapInputIo,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CalculateTagOverlapIoOutput {
    pub overlap: i32,
}

#[command]
pub fn calculate_tag_overlap(input: CalculateTagOverlapIoInput) -> Result<CalculateTagOverlapIoOutput> {
    let core = crate::state::core_state();
    let core_input: glimpse_core::CalculateTagOverlapInput = input.input.into();
    Ok(CalculateTagOverlapIoOutput {
        overlap: core.calculate_tag_overlap(&core_input),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CalculateNextReviewIoInput {
    #[serde(flatten)]
    pub input: CalculateNextReviewInputIo,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CalculateNextReviewIoOutput {
    #[serde(flatten)]
    pub output: CalculateNextReviewOutputIo,
}

#[command]
pub fn calculate_next_review(input: CalculateNextReviewIoInput) -> Result<CalculateNextReviewIoOutput> {
    let core = crate::state::core_state();
    let core_input: glimpse_core::CalculateNextReviewInput = input.input.try_into()?;
    let output = core.calculate_next_review(&core_input);
    Ok(CalculateNextReviewIoOutput {
        output: output.into(),
    })
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct InitializeReviewScheduleIoInput {
    #[serde(flatten)]
    pub input: InitializeReviewScheduleInputIo,
}

#[derive(Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct InitializeReviewScheduleIoOutput {
    #[serde(flatten)]
    pub output: InitializeReviewScheduleOutputIo,
}

#[command]
pub fn initialize_review_schedule(
    input: InitializeReviewScheduleIoInput,
) -> Result<InitializeReviewScheduleIoOutput> {
    let core = crate::state::core_state();
    let core_input: glimpse_core::InitializeReviewScheduleInput = input.input.into();
    let output = core.initialize_review_schedule(&core_input);
    Ok(InitializeReviewScheduleIoOutput {
        output: output.into(),
    })
}

/// Assembles the `glimpse.review` package with all review commands.
pub fn review_package() -> rustra::Package {
    static CACHED: std::sync::OnceLock<rustra::Package> = std::sync::OnceLock::new();
    CACHED
        .get_or_init(|| {
            register_commands(rustra::Package::builder("glimpse.review")).build()
        })
        .clone()
}

/// Registers this domain's commands onto an existing package builder.
///
/// Used both by [`review_package`] and by the unified `glimpse.core`
/// package — must live in this module because `#[command]`'s generated
/// metadata consts are module-private.
pub(crate) fn register_commands(
    builder: rustra::PackageBuilder,
) -> rustra::PackageBuilder {
    rustra::register!(
        builder,
        calculate_tag_overlap,
        calculate_next_review,
        initialize_review_schedule
    )
}
