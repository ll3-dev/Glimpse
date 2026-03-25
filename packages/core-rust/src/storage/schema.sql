-- Glimpse Core SQLite Schema
-- Version: 1

-- Knowledge Items
CREATE TABLE IF NOT EXISTS knowledge_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT,
    body TEXT,
    url TEXT,
    summary TEXT,
    tags TEXT, -- JSON array
    labels TEXT, -- JSON array
    provisional_labels TEXT, -- JSON array
    label_status TEXT,
    label_source TEXT,
    label_version TEXT,
    label_score REAL,
    label_requested_at INTEGER,
    label_completed_at INTEGER,
    label_error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    stability REAL,
    difficulty REAL,
    last_reviewed_at INTEGER,
    next_review_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_created_at ON knowledge_items(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_next_review_at ON knowledge_items(next_review_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_label_status ON knowledge_items(label_status);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT,
    icon TEXT,
    context_item_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at ON conversations(deleted_at);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    deleted_at INTEGER,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);

-- Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    item_a_id TEXT NOT NULL,
    item_b_id TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    responded_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at);

-- Feedback Events
CREATE TABLE IF NOT EXISTS feedback_events (
    id TEXT PRIMARY KEY,
    recommendation_id TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (recommendation_id) REFERENCES recommendations(id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_events_created_at ON feedback_events(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_events_recommendation_id ON feedback_events(recommendation_id);
