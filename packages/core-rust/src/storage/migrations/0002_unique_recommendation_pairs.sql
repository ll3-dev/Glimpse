BEGIN IMMEDIATE;

CREATE TEMP TABLE recommendation_pair_keep AS
WITH ranked_pairs AS (
    SELECT
        CASE WHEN item_a_id < item_b_id THEN item_a_id ELSE item_b_id END AS item_low,
        CASE WHEN item_a_id < item_b_id THEN item_b_id ELSE item_a_id END AS item_high,
        id AS keep_id,
        ROW_NUMBER() OVER (
            PARTITION BY
                CASE WHEN item_a_id < item_b_id THEN item_a_id ELSE item_b_id END,
                CASE WHEN item_a_id < item_b_id THEN item_b_id ELSE item_a_id END
            ORDER BY
                CASE status
                    WHEN 'accepted' THEN 4
                    WHEN 'pending' THEN 3
                    WHEN 'ignored' THEN 2
                    WHEN 'dismissed' THEN 1
                    ELSE 0
                END DESC,
                COALESCE(responded_at, created_at) DESC,
                created_at DESC,
                id DESC
        ) AS pair_rank
    FROM recommendations
)
SELECT item_low, item_high, keep_id
FROM ranked_pairs
WHERE pair_rank = 1;

UPDATE feedback_events
SET recommendation_id = (
    SELECT pair.keep_id
    FROM recommendations AS recommendation
    JOIN recommendation_pair_keep AS pair
      ON pair.item_low = CASE
          WHEN recommendation.item_a_id < recommendation.item_b_id
          THEN recommendation.item_a_id ELSE recommendation.item_b_id END
     AND pair.item_high = CASE
          WHEN recommendation.item_a_id < recommendation.item_b_id
          THEN recommendation.item_b_id ELSE recommendation.item_a_id END
    WHERE recommendation.id = feedback_events.recommendation_id
)
WHERE recommendation_id NOT IN (
    SELECT keep_id FROM recommendation_pair_keep
);

DELETE FROM recommendations
WHERE id NOT IN (SELECT keep_id FROM recommendation_pair_keep);

UPDATE recommendations
SET
    item_a_id = CASE WHEN item_a_id < item_b_id THEN item_a_id ELSE item_b_id END,
    item_b_id = CASE WHEN item_a_id < item_b_id THEN item_b_id ELSE item_a_id END;

DROP TABLE recommendation_pair_keep;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recommendations_unique_pair
ON recommendations(item_a_id, item_b_id);

PRAGMA user_version = 2;
COMMIT;
