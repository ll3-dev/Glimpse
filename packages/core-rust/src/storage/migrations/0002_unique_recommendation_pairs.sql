BEGIN IMMEDIATE;

CREATE TEMP TABLE recommendation_pair_keep AS
SELECT
    CASE WHEN item_a_id < item_b_id THEN item_a_id ELSE item_b_id END AS item_low,
    CASE WHEN item_a_id < item_b_id THEN item_b_id ELSE item_a_id END AS item_high,
    MIN(id) AS keep_id
FROM recommendations
GROUP BY item_low, item_high;

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
