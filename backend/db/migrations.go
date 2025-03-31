package db

import "database/sql"

func RunMigrations(db *sql.DB) error {
	migrations := []string{
		addIndexToDocuments,
	}

	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return err
		}
	}
	return nil
}

const addIndexToDocuments = `
	create index if not exists idx_docs_user_id on docs(user_id)
`