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
	cwd, err := os.Getwd()
	if err != nil {
		log.Fatalf("Failed to get current working directory: %v", err)
	}
	gitRepoPath := filepath.Join(cwd, "docsmith-repo")
	if _, err := os.Stat(gitRepoPath); os.IsNotExist(err) {
		if err := os.MkdirAll(gitRepoPath, 0755); err != nil {
			log.Fatalf("failed to create git repo folder, %v", err)
		}
	}

	if err := git.InitRepo(gitRepoPath); err != nil {
		log.Fatalf("failed to init git repo, %v", err)
	}

	if err != nil {
		log.Fatalf("Failed to get current working directory: %v", err)
	}
	dbPath := filepath.Join(cwd, "docsmith.db")
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