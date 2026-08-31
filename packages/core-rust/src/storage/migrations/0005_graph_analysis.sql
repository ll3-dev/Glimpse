BEGIN IMMEDIATE;

CREATE TABLE graph_analysis (
    item_id TEXT PRIMARY KEY,
    item_updated_at INTEGER NOT NULL,
    analyzer_version TEXT NOT NULL,
    analyzed_at INTEGER NOT NULL,
    edge_count INTEGER NOT NULL CHECK (edge_count >= 0),
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
    failure_count INTEGER NOT NULL CHECK (failure_count >= 0),
    FOREIGN KEY (item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_graph_analysis_status ON graph_analysis(status);
CREATE INDEX idx_graph_analysis_analyzed_at ON graph_analysis(analyzed_at);

PRAGMA user_version = 5;
COMMIT;
