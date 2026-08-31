//! Living Graph analysis watermark storage.

use rusqlite::params;

use crate::error::{Error, Result};
use crate::models::{
    GraphAnalysisCommitResult, GraphAnalysisRecord, GraphAnalysisStatus, Recommendation,
};

use super::{parse_json_column, SqliteStorage};

impl SqliteStorage {
    pub(super) fn prune_graph_data_for_item(&self, item_id: &str) -> Result<()> {
        self.conn.execute(
            r#"
            DELETE FROM feedback_events
            WHERE recommendation_id IN (
                SELECT id FROM recommendations WHERE item_a_id = ?1 OR item_b_id = ?1
            )
            "#,
            params![item_id],
        )?;
        self.conn.execute(
            r#"
            DELETE FROM graph_analysis
            WHERE item_id = ?1 OR item_id IN (
                SELECT item_a_id FROM recommendations WHERE item_a_id = ?1 OR item_b_id = ?1
                UNION
                SELECT item_b_id FROM recommendations WHERE item_a_id = ?1 OR item_b_id = ?1
            )
            "#,
            params![item_id],
        )?;
        self.conn.execute(
            "DELETE FROM recommendations WHERE item_a_id = ?1 OR item_b_id = ?1",
            params![item_id],
        )?;
        Ok(())
    }

    pub fn list_graph_analysis_records(&self) -> Result<Vec<GraphAnalysisRecord>> {
        let mut statement = self.conn.prepare(
            r#"
            SELECT item_id, item_updated_at, analyzer_version, analyzed_at,
                   edge_count, status, failure_count
            FROM graph_analysis
            ORDER BY item_id
            "#,
        )?;
        let records = statement
            .query_map([], |row| {
                Ok(GraphAnalysisRecord {
                    item_id: row.get(0)?,
                    item_updated_at: row.get(1)?,
                    analyzer_version: row.get(2)?,
                    analyzed_at: row.get(3)?,
                    edge_count: row.get(4)?,
                    status: parse_json_column(row, 5)?,
                    failure_count: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(records)
    }

    pub fn commit_graph_analysis(
        &self,
        records: &[GraphAnalysisRecord],
        recommendations: &[Recommendation],
    ) -> Result<GraphAnalysisCommitResult> {
        self.conn.execute_batch("BEGIN IMMEDIATE")?;
        let result = (|| -> Result<GraphAnalysisCommitResult> {
            let mut saved_recommendations = 0;
            for recommendation in recommendations {
                if recommendation.item_a_id == recommendation.item_b_id {
                    return Err(Error::InvalidInput(
                        "Graph recommendations cannot connect an item to itself".into(),
                    ));
                }
                let endpoint_count: i64 = self.conn.query_row(
                    "SELECT COUNT(*) FROM knowledge_items WHERE id = ?1 OR id = ?2",
                    params![recommendation.item_a_id, recommendation.item_b_id],
                    |row| row.get(0),
                )?;
                if endpoint_count != 2 {
                    return Err(Error::InvalidInput(format!(
                        "Graph recommendation {} has a missing endpoint",
                        recommendation.id
                    )));
                }

                let (item_a_id, item_b_id) =
                    if recommendation.item_a_id < recommendation.item_b_id {
                        (&recommendation.item_a_id, &recommendation.item_b_id)
                    } else {
                        (&recommendation.item_b_id, &recommendation.item_a_id)
                    };
                saved_recommendations += self.conn.execute(
                    r#"
                    INSERT INTO recommendations (
                        id, item_a_id, item_b_id, reason, status, created_at, responded_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                    ON CONFLICT(item_a_id, item_b_id) DO NOTHING
                    "#,
                    params![
                        recommendation.id,
                        item_a_id,
                        item_b_id,
                        recommendation.reason,
                        Self::recommendation_status_to_str(&recommendation.status),
                        recommendation.created_at,
                        recommendation.responded_at,
                    ],
                )?;
            }

            for record in records {
                self.conn.execute(
                    r#"
                    INSERT INTO graph_analysis (
                        item_id, item_updated_at, analyzer_version, analyzed_at,
                        edge_count, status, failure_count
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                    ON CONFLICT(item_id) DO UPDATE SET
                        item_updated_at = excluded.item_updated_at,
                        analyzer_version = excluded.analyzer_version,
                        analyzed_at = excluded.analyzed_at,
                        edge_count = excluded.edge_count,
                        status = excluded.status,
                        failure_count = excluded.failure_count
                    "#,
                    params![
                        record.item_id,
                        record.item_updated_at,
                        record.analyzer_version,
                        record.analyzed_at,
                        record.edge_count,
                        graph_analysis_status_to_str(record.status),
                        record.failure_count,
                    ],
                )?;
            }

            Ok(GraphAnalysisCommitResult {
                saved_recommendations,
                saved_analysis_records: records.len(),
            })
        })();

        match result {
            Ok(summary) => {
                self.conn.execute_batch("COMMIT")?;
                Ok(summary)
            }
            Err(error) => {
                let _ = self.conn.execute_batch("ROLLBACK");
                Err(error)
            }
        }
    }
}

fn graph_analysis_status_to_str(status: GraphAnalysisStatus) -> &'static str {
    match status {
        GraphAnalysisStatus::Completed => "completed",
        GraphAnalysisStatus::Failed => "failed",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{
        FeedbackActionType, FeedbackEvent, GraphAnalysisStatus, KnowledgeItem, KnowledgeItemType,
        RecommendationStatus,
    };

    fn item(id: &str) -> KnowledgeItem {
        KnowledgeItem {
            id: id.into(),
            item_type: KnowledgeItemType::Note,
            title: Some(id.into()),
            body: None,
            url: None,
            summary: None,
            tags: None,
            labels: None,
            provisional_labels: None,
            label_status: None,
            label_source: None,
            label_version: None,
            label_score: None,
            label_requested_at: None,
            label_completed_at: None,
            label_error: None,
            created_at: 10,
            updated_at: 20,
            stability: None,
            difficulty: None,
            last_reviewed_at: None,
            next_review_at: None,
        }
    }

    fn analysis(item_id: &str, edge_count: i64) -> GraphAnalysisRecord {
        GraphAnalysisRecord {
            item_id: item_id.into(),
            item_updated_at: 20,
            analyzer_version: "living-graph-v1".into(),
            analyzed_at: 30,
            edge_count,
            status: GraphAnalysisStatus::Completed,
            failure_count: 0,
        }
    }

    fn recommendation(id: &str, left: &str, right: &str) -> Recommendation {
        Recommendation {
            id: id.into(),
            item_a_id: left.into(),
            item_b_id: right.into(),
            reason: Some("shared".into()),
            status: RecommendationStatus::Pending,
            created_at: 30,
            responded_at: None,
        }
    }

    #[test]
    fn commits_and_lists_completed_zero_edge_analysis() {
        let storage = SqliteStorage::in_memory().unwrap();
        storage.insert_knowledge_item(&item("a")).unwrap();

        let result = storage
            .commit_graph_analysis(&[analysis("a", 0)], &[])
            .unwrap();

        assert_eq!(result.saved_recommendations, 0);
        assert_eq!(result.saved_analysis_records, 1);
        assert_eq!(storage.list_graph_analysis_records().unwrap(), vec![analysis("a", 0)]);
    }

    #[test]
    fn reverse_pair_commit_is_idempotent_and_reports_actual_insert_count() {
        let storage = SqliteStorage::in_memory().unwrap();
        storage.insert_knowledge_item(&item("a")).unwrap();
        storage.insert_knowledge_item(&item("b")).unwrap();

        let result = storage
            .commit_graph_analysis(
                &[analysis("a", 1), analysis("b", 1)],
                &[
                    recommendation("first", "a", "b"),
                    recommendation("reverse", "b", "a"),
                ],
            )
            .unwrap();

        assert_eq!(result.saved_recommendations, 1);
        assert_eq!(result.saved_analysis_records, 2);
        let recommendations = storage.list_recommendations().unwrap();
        assert_eq!(recommendations.len(), 1);
        assert_eq!(recommendations[0].item_a_id, "a");
        assert_eq!(recommendations[0].item_b_id, "b");
    }

    #[test]
    fn dangling_edge_rolls_back_analysis_watermarks() {
        let storage = SqliteStorage::in_memory().unwrap();
        storage.insert_knowledge_item(&item("a")).unwrap();

        let result = storage.commit_graph_analysis(
            &[analysis("a", 1)],
            &[recommendation("dangling", "a", "missing")],
        );

        assert!(result.is_err());
        assert!(storage.list_graph_analysis_records().unwrap().is_empty());
        assert!(storage.list_recommendations().unwrap().is_empty());
    }

    #[test]
    fn deleting_an_item_prunes_touching_edges_feedback_and_analysis() {
        let storage = SqliteStorage::in_memory().unwrap();
        storage.insert_knowledge_item(&item("a")).unwrap();
        storage.insert_knowledge_item(&item("b")).unwrap();
        storage
            .commit_graph_analysis(
                &[analysis("a", 1), analysis("b", 1)],
                &[recommendation("edge", "a", "b")],
            )
            .unwrap();
        storage
            .insert_feedback_event(&FeedbackEvent {
                id: "feedback".into(),
                recommendation_id: "edge".into(),
                action: FeedbackActionType::Accept,
                created_at: 40,
            })
            .unwrap();

        storage.delete_knowledge_item("a").unwrap();

        assert!(storage.list_recommendations().unwrap().is_empty());
        assert!(storage.list_all_feedback_events().unwrap().is_empty());
        assert!(storage.list_graph_analysis_records().unwrap().is_empty());
    }
}
