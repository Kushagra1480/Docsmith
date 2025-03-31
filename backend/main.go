package main

import (
	"docsmith/api"
	"docsmith/db"
	"docsmith/git"
	"fmt"
	"log"
	"os"
	"path/filepath"
)

func main() {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Fatalf("failed to get home directory %v", err)
	}

	gitRepoPath := filepath.Join(homeDir, "docsmith-repo")
	if _, err := os.Stat(gitRepoPath); os.IsNotExist(err) {
		if err := os.MkdirAll(gitRepoPath, 0755); err != nil {
			log.Fatalf("failed to create git repo folder, %v", err)
		}
	}

	if err := git.InitRepo(gitRepoPath); err != nil {
		log.Fatalf("failed to init git repo, %v", err)
	}

	dbPath := filepath.Join(homeDir, ".docsmith.db")
	database, err := db.InitDB(dbPath)
	if err != nil {
		log.Fatalf("failed to init db, %v", err)
	}
	defer database.Close()

	fmt.Println("Docksmith API server starting...")
	fmt.Println("Git repo path: ", gitRepoPath)
	fmt.Println("Database path: ", dbPath)

	router := api.SetupRouter(database, gitRepoPath)
	router.Run(":8080")
}