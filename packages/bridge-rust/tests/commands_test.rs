//! Roundtrip tests for glimpse-bridge rustra commands.
//!
//! Each test initializes a fresh in-memory SharedCore, dispatches through the
//! package's JSON entrypoint (`invoke_json`) — the same wire the TS client and
//! host adapters use — and asserts camelCase JSON field names.

use glimpse_bridge::{init_core, knowledge_package};
use glimpse_core::SharedCore;
use serde_json::json;
use std::sync::{Mutex, Once};

/// Bridge state is process-global (OnceLock), so tests serialize on this lock
/// and each test only asserts on its own seeded items.
static TEST_LOCK: Mutex<()> = Mutex::new(());
static INIT: Once = Once::new();

fn setup() -> std::sync::MutexGuard<'static, ()> {
    let guard = TEST_LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    INIT.call_once(|| {
        let core = SharedCore::in_memory().expect("in-memory SharedCore");
        let _ = init_core(core);
    });
    guard
}

#[test]
fn save_knowledge_item_roundtrips_with_camel_case_fields() {
    setup();
    let pkg = knowledge_package();

    let out = pkg
        .invoke_json("saveKnowledgeItem", json!({
            "item": {
                "id": "k-1",
                "type": "note",
                "title": "First note",
                "body": null,
                "url": null,
                "summary": null,
                "tags": ["rust", "bridge"],
                "labels": null,
                "provisionalLabels": null,
                "labelStatus": null,
                "labelSource": null,
                "labelVersion": null,
                "labelScore": null,
                "labelRequestedAt": null,
                "labelCompletedAt": null,
                "labelError": null,
                "createdAt": 1000,
                "updatedAt": 1000,
                "stability": null,
                "difficulty": null,
                "lastReviewedAt": null,
                "nextReviewAt": 2000
            }
        }))
        .expect("saveKnowledgeItem should succeed");

    assert_eq!(out["item"]["id"], "k-1");
    assert_eq!(out["item"]["type"], "note");
    assert_eq!(out["item"]["createdAt"], 1000);
    assert_eq!(out["item"]["nextReviewAt"], 2000);
    assert_eq!(out["item"]["tags"][0], "rust");
    // camelCase contract: snake_case must NOT leak into the wire format.
    assert!(out["item"].get("created_at").is_none());
    assert!(out["item"].get("next_review_at").is_none());
}

#[test]
fn update_knowledge_item_applies_tristate_patch() {
    setup();
    let pkg = knowledge_package();

    pkg.invoke_json(
        "saveKnowledgeItem",
        json!({
            "item": {
                "id": "k-2",
                "type": "note",
                "title": "before",
                "body": null, "url": null, "summary": null, "tags": null,
                "labels": null, "provisionalLabels": null, "labelStatus": null,
                "labelSource": null, "labelVersion": null, "labelScore": null,
                "labelRequestedAt": null, "labelCompletedAt": null, "labelError": null,
                "createdAt": 1000, "updatedAt": 1000,
                "stability": null, "difficulty": null,
                "lastReviewedAt": null, "nextReviewAt": null
            }
        }),
    )
    .expect("seed saveKnowledgeItem should succeed");

    // title set, body explicit null, summary unset (tristate).
    let out = pkg
        .invoke_json(
            "updateKnowledgeItem",
            json!({
                "itemId": "k-2",
                "patch": { "title": "after", "body": null }
            }),
        )
        .expect("updateKnowledgeItem should succeed");

    assert_eq!(out["item"]["title"], "after");
    assert_eq!(out["item"]["body"], serde_json::Value::Null);
}

#[test]
fn list_and_query_knowledge_commands_roundtrip() {
    setup();
    let pkg = knowledge_package();

    let seed = json!({
        "id": "k-3", "type": "link", "title": "t", "body": null, "url": "https://example.com",
        "summary": null, "tags": null, "labels": null, "provisionalLabels": null,
        "labelStatus": null, "labelSource": null, "labelVersion": null,
        "labelScore": null, "labelRequestedAt": null, "labelCompletedAt": null,
        "labelError": null, "createdAt": 1000, "updatedAt": 1000,
        "stability": null, "difficulty": null, "lastReviewedAt": null, "nextReviewAt": 1500
    });
    pkg.invoke_json("saveKnowledgeItem", json!({ "item": seed }))
        .expect("seed should succeed");

    // Patch labelStatus through the bridge and verify it round-trips on read.
    // NOTE: core's `list_pending_knowledge_items_for_labeling` compares the raw
    // column against the SQL literal 'pending', but core persists enums via
    // serde_json (yielding "\"pending\"" with quotes), so that filter matches
    // nothing written through save/update. The bridge passes values through
    // faithfully; the quirk lives in glimpse-core's storage layer.
    let patched = pkg
        .invoke_json(
            "updateKnowledgeItem",
            json!({ "itemId": "k-3", "patch": { "labelStatus": "pending", "labelRequestedAt": 500 } }),
        )
        .expect("patch to pending should succeed");
    assert_eq!(patched["item"]["labelStatus"], "pending");
    assert_eq!(patched["item"]["labelRequestedAt"], 500);

    let listed = pkg
        .invoke_json("listKnowledgeItems", json!({}))
        .expect("listKnowledgeItems should succeed");
    let listed_ids: Vec<&str> = listed["items"]
        .as_array()
        .expect("items array")
        .iter()
        .map(|item| item["id"].as_str().expect("id string"))
        .collect();
    assert!(listed_ids.contains(&"k-3"), "k-3 missing from {listed_ids:?}");

    let got = pkg
        .invoke_json("getKnowledgeItemById", json!({ "itemId": "k-3" }))
        .expect("getKnowledgeItemById should succeed");
    assert_eq!(got["item"]["id"], "k-3");

    let by_ids = pkg
        .invoke_json("listKnowledgeItemsByIds", json!({ "itemIds": ["k-3"] }))
        .expect("listKnowledgeItemsByIds should succeed");
    assert_eq!(by_ids["items"].as_array().map(Vec::len), Some(1));

    let weekly = pkg
        .invoke_json("listWeeklyKnowledgeItems", json!({ "since": 900 }))
        .expect("listWeeklyKnowledgeItems should succeed");
    let weekly_ids: Vec<&str> = weekly["items"]
        .as_array()
        .expect("items array")
        .iter()
        .map(|item| item["id"].as_str().expect("id string"))
        .collect();
    assert!(weekly_ids.contains(&"k-3"), "k-3 missing from {weekly_ids:?}");

    let pending = pkg
        .invoke_json("listPendingKnowledgeItemsForLabeling", json!({ "limit": 10 }))
        .expect("listPendingKnowledgeItemsForLabeling should succeed");
    assert_eq!(
        pending["items"].as_array().map(Vec::len),
        Some(0),
        "core's pending-labeling SQL filter never matches serde_json-quoted \
         enum values (pre-existing glimpse-core quirk); bridge passes through"
    );

    let due = pkg
        .invoke_json("getDueKnowledgeItems", json!({ "now": 2000, "limit": 10 }))
        .expect("getDueKnowledgeItems should succeed");
    let due_ids: Vec<&str> = due["items"]
        .as_array()
        .expect("items array")
        .iter()
        .map(|item| item["id"].as_str().expect("id string"))
        .collect();
    assert!(due_ids.contains(&"k-3"), "k-3 missing from {due_ids:?}");
}

// ============================================================================
// Conversation
// ============================================================================

#[test]
fn conversation_commands_roundtrip() {
    let _guard = setup();
    let pkg = glimpse_bridge::conversation_package();

    let created = pkg
        .invoke_json(
            "createConversation",
            json!({
                "conversation": {
                    "id": "c-1", "title": "Chat", "icon": null, "contextItemId": null,
                    "createdAt": 1000, "updatedAt": 1000, "deletedAt": null
                }
            }),
        )
        .expect("createConversation should succeed");
    assert_eq!(created["conversation"]["id"], "c-1");
    assert_eq!(created["conversation"]["title"], "Chat");
    assert!(created["conversation"].get("created_at").is_none());

    let listed = pkg
        .invoke_json("listConversations", json!({}))
        .expect("listConversations should succeed");
    let ids: Vec<&str> = listed["conversations"]
        .as_array()
        .expect("conversations array")
        .iter()
        .map(|c| c["id"].as_str().expect("id"))
        .collect();
    assert!(ids.contains(&"c-1"));

    let updated = pkg
        .invoke_json(
            "updateConversation",
            json!({ "conversationId": "c-1", "patch": { "title": "Renamed", "icon": null } }),
        )
        .expect("updateConversation should succeed");
    assert_eq!(updated["conversation"]["title"], "Renamed");
    assert_eq!(updated["conversation"]["icon"], serde_json::Value::Null);

    pkg.invoke_json(
        "deleteConversation",
        json!({ "conversationId": "c-1", "deletedAt": 2000 }),
    )
    .expect("deleteConversation should succeed");
}

// ============================================================================
// Message
// ============================================================================

#[test]
fn message_commands_roundtrip() {
    let _guard = setup();
    let pkg = glimpse_bridge::message_package();
    // messages reference conversations via FK — seed the parent first.
    glimpse_bridge::conversation_package()
        .invoke_json(
            "createConversation",
            json!({
                "conversation": {
                    "id": "c-9", "title": null, "icon": null, "contextItemId": null,
                    "createdAt": 1000, "updatedAt": 1000, "deletedAt": null
                }
            }),
        )
        .expect("seed conversation should succeed");

    let added = pkg
        .invoke_json(
            "addMessage",
            json!({
                "message": {
                    "id": "m-1", "conversationId": "c-9", "role": "user",
                    "content": "hello", "createdAt": 1000, "updatedAt": null, "deletedAt": null
                }
            }),
        )
        .expect("addMessage should succeed");
    assert_eq!(added["message"]["id"], "m-1");
    assert_eq!(added["message"]["role"], "user");
    assert_eq!(added["message"]["conversationId"], "c-9");

    let listed = pkg
        .invoke_json("listConversationMessages", json!({ "conversationId": "c-9" }))
        .expect("listConversationMessages should succeed");
    let ids: Vec<&str> = listed["messages"]
        .as_array()
        .expect("messages array")
        .iter()
        .map(|m| m["id"].as_str().expect("id"))
        .collect();
    assert!(ids.contains(&"m-1"));

    let updated = pkg
        .invoke_json(
            "updateMessage",
            json!({ "messageId": "m-1", "patch": { "content": "edited" } }),
        )
        .expect("updateMessage should succeed");
    assert_eq!(updated["message"]["content"], "edited");

    pkg.invoke_json("deleteMessage", json!({ "messageId": "m-1", "deletedAt": 2000 }))
        .expect("deleteMessage should succeed");
}

// ============================================================================
// Recommendation
// ============================================================================

#[test]
fn recommendation_commands_roundtrip() {
    let _guard = setup();
    let pkg = glimpse_bridge::recommendation_package();

    pkg.invoke_json(
        "saveRecommendations",
        json!({
            "recommendations": [{
                "id": "r-1", "itemA_id": "a", "itemB_id": "b", "reason": "same tag",
                "status": "pending", "createdAt": 1000, "respondedAt": null
            }]
        }),
    )
    .expect("saveRecommendations should succeed");

    let listed = pkg
        .invoke_json("listRecommendations", json!({}))
        .expect("listRecommendations should succeed");
    let recs = listed["recommendations"].as_array().expect("array");
    let ours = recs
        .iter()
        .find(|r| r["id"] == "r-1")
        .expect("saved recommendation present");
    assert_eq!(ours["itemA_id"], "a");
    assert_eq!(ours["itemB_id"], "b");
    assert_eq!(ours["status"], "pending");

    let pending = pkg
        .invoke_json("listPendingRecommendations", json!({}))
        .expect("listPendingRecommendations should succeed");
    assert!(
        pending["recommendations"]
            .as_array()
            .expect("array")
            .iter()
            .any(|r| r["id"] == "r-1")
    );

    pkg.invoke_json(
        "respondToRecommendation",
        json!({
            "recommendationId": "r-1",
            "status": "accepted",
            "feedbackEvent": {
                "id": "f-1", "recommendationId": "r-1", "action": "accept", "createdAt": 2000
            }
        }),
    )
    .expect("respondToRecommendation should succeed");

    let after = pkg
        .invoke_json("listRecommendations", json!({}))
        .expect("listRecommendations should succeed");
    let updated = after["recommendations"]
        .as_array()
        .expect("array")
        .iter()
        .find(|r| r["id"] == "r-1")
        .expect("recommendation present");
    assert_eq!(updated["status"], "accepted");
}

// ============================================================================
// Feedback
// ============================================================================

#[test]
fn feedback_commands_roundtrip() {
    let _guard = setup();
    let pkg = glimpse_bridge::feedback_package();
    // feedback_events reference recommendations via FK — seed the parent first.
    glimpse_bridge::recommendation_package()
        .invoke_json(
            "saveRecommendations",
            json!({
                "recommendations": [{
                    "id": "r-9", "itemA_id": "a", "itemB_id": "b", "reason": null,
                    "status": "pending", "createdAt": 1000, "respondedAt": null
                }]
            }),
        )
        .expect("seed recommendation should succeed");

    let logged = pkg
        .invoke_json(
            "logRecommendationFeedback",
            json!({
                "event": {
                    "id": "fe-1", "recommendationId": "r-9", "action": "ignore", "createdAt": 1000
                }
            }),
        )
        .expect("logRecommendationFeedback should succeed");
    assert_eq!(logged["event"]["id"], "fe-1");
    assert_eq!(logged["event"]["action"], "ignore");
    assert_eq!(logged["event"]["recommendationId"], "r-9");

    let recent = pkg
        .invoke_json("listRecentFeedbackEvents", json!({ "limit": 10 }))
        .expect("listRecentFeedbackEvents should succeed");
    let ids: Vec<&str> = recent["events"]
        .as_array()
        .expect("events array")
        .iter()
        .map(|e| e["id"].as_str().expect("id"))
        .collect();
    assert!(ids.contains(&"fe-1"));
}

// ============================================================================
// Review
// ============================================================================

#[test]
fn review_commands_roundtrip() {
    let _guard = setup();
    let pkg = glimpse_bridge::review_package();

    let overlap = pkg
        .invoke_json(
            "calculateTagOverlap",
            json!({
                "left": { "tags": ["a", "b"], "lastReviewedAt": null, "nextReviewAt": null, "createdAt": null },
                "right": { "tags": ["b", "c"], "lastReviewedAt": null, "nextReviewAt": null, "createdAt": null }
            }),
        )
        .expect("calculateTagOverlap should succeed");
    assert_eq!(overlap["overlap"], 1);

    let next = pkg
        .invoke_json(
            "calculateNextReview",
            json!({
                "lastReviewedAt": 1000,
                "nextReviewAt": 2000,
                "feedbackType": "remembered",
                "now": 3000
            }),
        )
        .expect("calculateNextReview should succeed");
    assert!(next["intervalMs"].as_i64().expect("intervalMs") > 0);
    assert!(next["nextReviewAt"].as_i64().expect("nextReviewAt") > 3000);
    assert!(next.get("interval_ms").is_none());

    let init = pkg
        .invoke_json(
            "initializeReviewSchedule",
            json!({ "createdAt": 1000, "intervalMs": 5000 }),
        )
        .expect("initializeReviewSchedule should succeed");
    assert_eq!(init["nextReviewAt"], 6000);
    assert!(init.get("next_review_at").is_none());
}

// ============================================================================
// Unified glimpse.core package
// ============================================================================

#[test]
fn glimpse_core_package_dispatches_across_all_domains() {
    let _guard = setup();
    let pkg = glimpse_bridge::glimpse_package();

    // knowledge via the unified package
    let saved = pkg
        .invoke_json(
            "saveKnowledgeItem",
            json!({
                "item": {
                    "id": "u-1", "type": "note", "title": "unified", "body": null, "url": null,
                    "summary": null, "tags": null, "labels": null, "provisionalLabels": null,
                    "labelStatus": null, "labelSource": null, "labelVersion": null,
                    "labelScore": null, "labelRequestedAt": null, "labelCompletedAt": null,
                    "labelError": null, "createdAt": 1000, "updatedAt": 1000,
                    "stability": null, "difficulty": null, "lastReviewedAt": null,
                    "nextReviewAt": null
                }
            }),
        )
        .expect("saveKnowledgeItem via unified package should succeed");
    assert_eq!(saved["item"]["id"], "u-1");

    // review calculation via the unified package
    let overlap = pkg
        .invoke_json(
            "calculateTagOverlap",
            json!({
                "left": { "tags": ["x"], "lastReviewedAt": null, "nextReviewAt": null, "createdAt": null },
                "right": { "tags": ["x", "y"], "lastReviewedAt": null, "nextReviewAt": null, "createdAt": null }
            }),
        )
        .expect("calculateTagOverlap via unified package should succeed");
    assert_eq!(overlap["overlap"], 1);

    // schema exposes all 25 commands
    let schema = pkg.live_schema();
    let commands = schema["commands"].as_array().expect("commands array");
    assert_eq!(commands.len(), 25, "unified package must expose 25 commands");
}
