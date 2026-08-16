//! End-to-end smoke of the rustra bridge inside the desktop crate.
//!
//! Drives `glimpse_bridge::glimpse_package().invoke_json(...)` over a temp-dir
//! SQLite file — the exact dispatch surface `rustra_dispatch` calls in
//! main.rs — covering a write, a read, an envelope shape, and the structured
//! error path (`{code, message}`).

use glimpse_core::SharedCore;
use serde_json::json;

#[test]
fn glimpse_package_dispatches_over_sqlite_file() {
    let dir = tempfile::tempdir().expect("tempdir");
    let db_path = dir.path().join("smoke.db");
    let storage =
        glimpse_core::SqliteStorage::new(&db_path).expect("open sqlite storage in temp dir");
    let previously = glimpse_bridge::init_core(SharedCore::new(storage));
    // Parallel test binaries each get their own process, so this must be None.
    assert!(previously.is_none(), "core already initialized");

    let package = glimpse_bridge::glimpse_package();

    // Write path — camelCase in, camelCase out.
    let saved = package
        .invoke_json(
            "saveKnowledgeItem",
            json!({
                "item": {
                    "id": "k-smoke",
                    "type": "note",
                    "title": "Smoke item",
                    "body": null,
                    "url": null,
                    "summary": null,
                    "tags": ["rust", "tauri"],
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
                    "nextReviewAt": null
                }
            }),
        )
        .expect("saveKnowledgeItem dispatch should succeed");
    assert_eq!(saved["item"]["id"], "k-smoke");
    assert_eq!(saved["item"]["title"], "Smoke item");
    assert_eq!(saved["item"]["tags"][0], "rust");

    // Read path — envelope unwrapping mirrors the TS client.
    let listed = package
        .invoke_json("listKnowledgeItems", json!({}))
        .expect("listKnowledgeItems dispatch should succeed");
    let items = listed["items"].as_array().expect("items envelope");
    let found = items
        .iter()
        .any(|item| item["id"] == "k-smoke" && item["type"] == "note");
    assert!(found, "saved item should be listed: {listed}");

    // Error path — structured RustraError, not a string.
    let err = package
        .invoke_json("updateKnowledgeItem", json!({
            "itemId": "does-not-exist",
            "patch": { "title": "x" }
        }))
        .expect_err("updating a missing item should fail");
    let serialized = serde_json::to_value(&err).expect("RustraError serializes");
    assert_eq!(serialized["code"], "glimpse.not_found");
    assert!(
        serialized["message"]
            .as_str()
            .expect("message string")
            .contains("does-not-exist"),
        "message should name the missing item: {serialized}"
    );

    // Command surface — all 25 registered commands resolve. List-style
    // commands accept `{}` and succeed; argument-taking ones fail arg
    // deserialization; either outcome proves the command exists.
    let expected = [
        "saveKnowledgeItem", "listKnowledgeItems", "getKnowledgeItemById",
        "updateKnowledgeItem", "listKnowledgeItemsByIds", "listWeeklyKnowledgeItems",
        "listPendingKnowledgeItemsForLabeling", "getDueKnowledgeItems",
        "createConversation", "listConversations", "updateConversation",
        "deleteConversation", "listConversationMessages", "addMessage",
        "updateMessage", "deleteMessage", "saveRecommendations",
        "listRecommendations", "listPendingRecommendations", "respondToRecommendation",
        "listRecentFeedbackEvents", "logRecommendationFeedback",
        "calculateTagOverlap", "calculateNextReview", "initializeReviewSchedule",
    ];
    for name in expected {
        if let Err(err) = package.invoke_json(name, json!({})) {
            assert_ne!(
                err.code(),
                "command.not_found",
                "command {name} should be registered"
            );
        }
    }
}
