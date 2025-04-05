-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);

-- Documents table
CREATE TABLE IF NOT EXISTS docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Document shares table
CREATE TABLE IF NOT EXISTS doc_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER NOT NULL,
    share_id TEXT NOT NULL UNIQUE,
    can_edit BOOLEAN NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expire_at DATETIME NOT NULL,
    FOREIGN KEY (doc_id) REFERENCES docs (id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
);

-- Collaborators table
CREATE TABLE IF NOT EXISTS collaborators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER NOT NULL,
    user_id INTEGER,
    anonymous_id TEXT,
    display_name TEXT NOT NULL,
    last_active DATETIME NOT NULL,
    FOREIGN KEY (doc_id) REFERENCES docs (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Indexes from migrations
CREATE INDEX IF NOT EXISTS idx_docs_user_id ON docs(user_id);