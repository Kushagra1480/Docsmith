package db

import (
	"database/sql"
	"log"
	_ "github.com/mattn/go-sqlite3"
)

func InitDB(dbPath string) (*sql.DB, error) {
    log.Printf("Creating/opening database at: %s", dbPath)
    db, err := sql.Open("sqlite3", dbPath)
    if err != nil {
        log.Printf("Error opening database: %v", err)
        return nil, err
    }

    if err = db.Ping(); err != nil {
        log.Printf("Error pinging database: %v", err)
        return nil, err
    }

    if err = createTables(db); err != nil {
        log.Printf("Error creating tables: %v", err)
        return nil, err
    }

    log.Println("Database initialized successfully")
    return db, nil
}

func createTables(db *sql.DB) error {
	createUsersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password_hash TEXT NOT NULL
	);
	`

	createDocsTable := `
	CREATE TABLE IF NOT EXISTS docs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		title TEXT NOT NULL,
		content TEXT,
		updated_at DATETIME NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
	);
	`
	
	createDocSharesTable := `
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
	`
	
	createCollaboratorsTable := `
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
	`

	_, err := db.Exec(createUsersTable)
	if err != nil {
		return err
	}

	_, err = db.Exec(createDocsTable)
	if err != nil {
		return err
	}
	
	_, err = db.Exec(createDocSharesTable)
	if err != nil {
		return err
	}
	
	_, err = db.Exec(createCollaboratorsTable)
	if err != nil {
		return err
	}

	return nil
}