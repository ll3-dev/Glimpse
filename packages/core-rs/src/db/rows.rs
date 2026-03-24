use anyhow::anyhow;
use rusqlite::{types::Type, Error, Row};

use crate::models::{
    Conversation, FeedbackActionType, FeedbackEvent, KnowledgeItem, KnowledgeItemLabelSource,
    KnowledgeItemLabelStatus, KnowledgeItemType, Message, MessageRole, Recommendation,
    RecommendationStatus,
};

use super::patches::{parse_optional_string_array, parse_required_string_array};

pub fn map_knowledge_item_row(row: &Row<'_>) -> rusqlite::Result<KnowledgeItem> {
    Ok(KnowledgeItem {
        id: row.get(0)?,
        item_type: parse_knowledge_item_type(&row.get::<_, String>(1)?)?,
        title: row.get(2)?,
        body: row.get(3)?,
        url: row.get(4)?,
        summary: row.get(5)?,
        tags: parse_required_string_array(row.get(6)?)?,
        labels: parse_optional_string_array(row.get(7)?)?,
        provisional_labels: parse_optional_string_array(row.get(8)?)?,
        label_status: parse_optional_label_status(row.get(9)?)?,
        label_source: parse_optional_label_source(row.get(10)?)?,
        label_version: row.get(11)?,
        label_score: row.get(12)?,
        label_requested_at: parse_optional_i64(row.get(13)?),
        label_completed_at: parse_optional_i64(row.get(14)?),
        label_error: row.get(15)?,
        created_at: parse_i64(row.get(16)?),
        updated_at: parse_i64(row.get(17)?),
        stability: row.get(18)?,
        difficulty: row.get(19)?,
        last_reviewed_at: parse_optional_i64(row.get(20)?),
        next_review_at: parse_optional_i64(row.get(21)?),
    })
}

pub fn map_recommendation_row(row: &Row<'_>) -> rusqlite::Result<Recommendation> {
    Ok(Recommendation {
        id: row.get(0)?,
        item_a_id: row.get(1)?,
        item_b_id: row.get(2)?,
        reason: row.get(3)?,
        status: parse_recommendation_status(&row.get::<_, String>(4)?)?,
        created_at: parse_i64(row.get(5)?),
        responded_at: parse_optional_i64(row.get(6)?),
    })
}

pub fn map_feedback_event_row(row: &Row<'_>) -> rusqlite::Result<FeedbackEvent> {
    Ok(FeedbackEvent {
        id: row.get(0)?,
        recommendation_id: row.get(1)?,
        action: parse_feedback_action(&row.get::<_, String>(2)?)?,
        created_at: parse_i64(row.get(3)?),
    })
}

pub fn map_conversation_row(row: &Row<'_>) -> rusqlite::Result<Conversation> {
    Ok(Conversation {
        id: row.get(0)?,
        title: row.get(1)?,
        icon: row.get(2)?,
        context_item_id: row.get(3)?,
        created_at: parse_i64(row.get(4)?),
        updated_at: parse_i64(row.get(5)?),
        deleted_at: parse_optional_i64(row.get(6)?),
    })
}

pub fn map_message_row(row: &Row<'_>) -> rusqlite::Result<Message> {
    Ok(Message {
        id: row.get(0)?,
        conversation_id: row.get(1)?,
        role: parse_message_role(&row.get::<_, String>(2)?)?,
        content: row.get(3)?,
        created_at: parse_i64(row.get(4)?),
        updated_at: parse_optional_i64(row.get(5)?),
        deleted_at: parse_optional_i64(row.get(6)?),
    })
}

pub fn collect_rows<T>(
    rows: rusqlite::MappedRows<'_, impl FnMut(&Row<'_>) -> rusqlite::Result<T>>,
) -> anyhow::Result<Vec<T>> {
    let mut items = Vec::new();
    for row in rows {
        items.push(row?);
    }
    Ok(items)
}

pub fn parse_optional_i64(raw: Option<f64>) -> Option<i64> {
    raw.map(parse_i64)
}

pub fn parse_i64(raw: f64) -> i64 {
    raw.round() as i64
}

pub fn parse_knowledge_item_type(value: &str) -> rusqlite::Result<KnowledgeItemType> {
    match value {
        "note" => Ok(KnowledgeItemType::Note),
        "link" => Ok(KnowledgeItemType::Link),
        "highlight" => Ok(KnowledgeItemType::Highlight),
        "screenshot" => Ok(KnowledgeItemType::Screenshot),
        "share" => Ok(KnowledgeItemType::Share),
        _ => Err(to_sql_conversion_error(anyhow!("invalid knowledge item type: {value}"))),
    }
}

pub fn parse_optional_label_status(
    raw: Option<String>,
) -> rusqlite::Result<Option<KnowledgeItemLabelStatus>> {
    raw.map(|value| parse_label_status(&value)).transpose()
}

pub fn parse_label_status(value: &str) -> rusqlite::Result<KnowledgeItemLabelStatus> {
    match value {
        "idle" => Ok(KnowledgeItemLabelStatus::Idle),
        "pending" => Ok(KnowledgeItemLabelStatus::Pending),
        "provisional" => Ok(KnowledgeItemLabelStatus::Provisional),
        "final" => Ok(KnowledgeItemLabelStatus::Final),
        "failed" => Ok(KnowledgeItemLabelStatus::Failed),
        _ => Err(to_sql_conversion_error(anyhow!("invalid label status: {value}"))),
    }
}

pub fn parse_optional_label_source(
    raw: Option<String>,
) -> rusqlite::Result<Option<KnowledgeItemLabelSource>> {
    raw.map(|value| parse_label_source(&value)).transpose()
}

pub fn parse_label_source(value: &str) -> rusqlite::Result<KnowledgeItemLabelSource> {
    match value {
        "none" => Ok(KnowledgeItemLabelSource::None),
        "rules" => Ok(KnowledgeItemLabelSource::Rules),
        "apple" => Ok(KnowledgeItemLabelSource::Apple),
        "local_small" => Ok(KnowledgeItemLabelSource::LocalSmall),
        "local_full" => Ok(KnowledgeItemLabelSource::LocalFull),
        "byok" => Ok(KnowledgeItemLabelSource::Byok),
        _ => Err(to_sql_conversion_error(anyhow!("invalid label source: {value}"))),
    }
}

pub fn parse_recommendation_status(value: &str) -> rusqlite::Result<RecommendationStatus> {
    match value {
        "pending" => Ok(RecommendationStatus::Pending),
        "accepted" => Ok(RecommendationStatus::Accepted),
        "ignored" => Ok(RecommendationStatus::Ignored),
        "dismissed" => Ok(RecommendationStatus::Dismissed),
        _ => Err(to_sql_conversion_error(anyhow!("invalid recommendation status: {value}"))),
    }
}

pub fn parse_feedback_action(value: &str) -> rusqlite::Result<FeedbackActionType> {
    match value {
        "accept" => Ok(FeedbackActionType::Accept),
        "ignore" => Ok(FeedbackActionType::Ignore),
        "dismiss" => Ok(FeedbackActionType::Dismiss),
        _ => Err(to_sql_conversion_error(anyhow!("invalid feedback action: {value}"))),
    }
}

pub fn parse_message_role(value: &str) -> rusqlite::Result<MessageRole> {
    match value {
        "user" => Ok(MessageRole::User),
        "assistant" => Ok(MessageRole::Assistant),
        _ => Err(to_sql_conversion_error(anyhow!("invalid message role: {value}"))),
    }
}

pub fn to_knowledge_item_type(value: &KnowledgeItemType) -> &'static str {
    match value {
        KnowledgeItemType::Note => "note",
        KnowledgeItemType::Link => "link",
        KnowledgeItemType::Highlight => "highlight",
        KnowledgeItemType::Screenshot => "screenshot",
        KnowledgeItemType::Share => "share",
    }
}

pub fn to_label_status(value: &KnowledgeItemLabelStatus) -> &'static str {
    match value {
        KnowledgeItemLabelStatus::Idle => "idle",
        KnowledgeItemLabelStatus::Pending => "pending",
        KnowledgeItemLabelStatus::Provisional => "provisional",
        KnowledgeItemLabelStatus::Final => "final",
        KnowledgeItemLabelStatus::Failed => "failed",
    }
}

pub fn to_label_source(value: &KnowledgeItemLabelSource) -> &'static str {
    match value {
        KnowledgeItemLabelSource::None => "none",
        KnowledgeItemLabelSource::Rules => "rules",
        KnowledgeItemLabelSource::Apple => "apple",
        KnowledgeItemLabelSource::LocalSmall => "local_small",
        KnowledgeItemLabelSource::LocalFull => "local_full",
        KnowledgeItemLabelSource::Byok => "byok",
    }
}

pub fn to_recommendation_status(value: &RecommendationStatus) -> &'static str {
    match value {
        RecommendationStatus::Pending => "pending",
        RecommendationStatus::Accepted => "accepted",
        RecommendationStatus::Ignored => "ignored",
        RecommendationStatus::Dismissed => "dismissed",
    }
}

pub fn to_feedback_action(value: &FeedbackActionType) -> &'static str {
    match value {
        FeedbackActionType::Accept => "accept",
        FeedbackActionType::Ignore => "ignore",
        FeedbackActionType::Dismiss => "dismiss",
    }
}

pub fn to_message_role(value: &MessageRole) -> &'static str {
    match value {
        MessageRole::User => "user",
        MessageRole::Assistant => "assistant",
    }
}

pub fn to_sql_conversion_error(error: impl std::fmt::Display) -> Error {
    Error::FromSqlConversionFailure(
        0,
        Type::Text,
        Box::new(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            error.to_string(),
        )),
    )
}
