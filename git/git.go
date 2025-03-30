package git

import (
	"os"
	"path/filepath"
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
)

type Commit struct {
	Hash      string    `json:"hash"`
	Message   string    `json:"message"`
	Author    string    `json:"author"`
	Timestamp time.Time `json:"timestamp"`
}

func InitRepo(repoPath string) error {
	_, err := os.Stat(filepath.Join(repoPath, ".git"))
	if os.IsNotExist(err) {
		_, err = git.PlainInit(repoPath, false)
		if err != nil {
			return err
		}
		return createInitialCommit(repoPath)
	}
	return nil
	
}

func createInitialCommit(repoPath string) error {
	r, err := git.PlainOpen(repoPath)
	if err != nil {
		return err
	}

	w, err := r.Worktree()
	if err != nil {
		return err
	}

	readmePath := filepath.Join(repoPath,  "README.md")
	err = os.WriteFile(readmePath, 
		[]byte("# DocSmith Repository\n\n This repo contains your markdown documents managed by DocSmith."), 0644)
	if err != nil {
		return err
	}
	_, err = w.Add("READNE.md")
	if err != nil{
		return err
	}

	_, err = w.Commit("Initial commit", &git.CommitOptions{
		Author: &object.Signature {
			Name: "DocSmith",
			Email: "docsmith@example.com",
			When: time.Now(),
		},
	})
	return err
}

func SaveDocument(docPath string, content string) error {
	return os.WriteFile(docPath, []byte(content), 0644)
}

func DeleteDocument(docPath string) error {
	_, err := os.Stat(docPath)
	if os.IsNotExist(err) {
		return nil
	}
	return os.Remove(docPath)
}

func CommitChanges(repoPath string, message string) error {
	r, err := git.PlainOpen(repoPath)
	if err != nil {
		return err
	}

	w, err := r.Worktree()
	if err != nil {
		return err
	}

	status, err := w.Status()
	if err != nil {
		return err
	}

	for file := range status {
		_, err = w.Add(file)
		if err != nil {
			return err
		}
	}

	_, err = w.Commit(message, &git.CommitOptions{
		Author: &object.Signature{
			Name: "DocSmith",
			Email: "docsmith@example.com",
			When: time.Now(),
		},
	})
	return err
}

func GetDocumentHistory(repoPath string, docPath string) ([]Commit, error) {
	var commits []Commit
	
	r, err := git.PlainOpen(repoPath)
	if err != nil {
		return commits, err
	}

	relativePath, err := filepath.Rel(repoPath, docPath)
	if err != nil {
		return commits, err
	}

	cIter, err := r.Log(&git.LogOptions{FileName: &relativePath}) 
	if err != nil {
		return commits, err
	}

	err = cIter.ForEach(func(c *object.Commit) error {
		commits = append(commits, Commit {
			Hash: c.Hash.String(),
			Message: c.Message,
			Author: c.Author.Name,
			Timestamp: c.Author.When,
		})
		return nil
	})

	return commits, err
}
