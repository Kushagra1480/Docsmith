package db

import (
	"database/sql"
	"log"
)

func InitDB(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	if err = db.Ping(); err != nil {
		return nil, err
	}

	if err = createTables(db); err != nil {
		return nil, err
	}

	log.Println("Database initialized successfully")
	return db, nil
}

func createTables(db *sql.DB) error {
	createUsersTable := `
		create table if not exists users (
			id integer primary key autoincrement 
			username text not null unique
			password_hash text not null
		)	
	`

	createDocsTable := `
		create table if not exists docs (
			id integer primary key autoincrement, 
			user_id integer not null,
			title text not null,
			content text,
			updated_at datetime not null,
			foreign key (user_id) references users (id) on delete cascade
		)
	`
	
	_, err := db.Exec(createUsersTable) 
	if err != nil {
		return err
	}

	_, err = db.Exec(createDocsTable) 
	if err != nil {
		return err
	}

	return nil
}