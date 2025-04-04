package git

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/go-git/go-git/v5/plumbing"
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
    // Check if the repo path exists
    if _, err := os.Stat(repoPath); os.IsNotExist(err) {
        return fmt.Errorf("repository path does not exist: %s", repoPath)
    }

    // Open the repository
    r, err := git.PlainOpen(repoPath)
    if err != nil {
        return fmt.Errorf("failed to open git repository: %w", err)
    }

    // Get worktree
    w, err := r.Worktree()
    if err != nil {
        return fmt.Errorf("failed to get worktree: %w", err)
    }

    // Check status
    status, err := w.Status()
    if err != nil {
        return fmt.Errorf("failed to get git status: %w", err)
    }

    // If no changes, return early
    if status.IsClean() {
        return nil
    }

    // Add files
    for file := range status {
        _, err = w.Add(file)
        if err != nil {
            return fmt.Errorf("failed to add file %s: %w", file, err)
        }
    }

    // Commit
    _, err = w.Commit(message, &git.CommitOptions{
        Author: &object.Signature{
            Name:  "DocSmith",
            Email: "docsmith@example.com",
            When:  time.Now(),
        },
    })
    if err != nil {
        return fmt.Errorf("failed to commit: %w", err)
    }

    return nil
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

// Add these new functions to the git.go file

func CommitChangesWithHash(repoPath string, message string) (string, error) {
	r, err := git.PlainOpen(repoPath)
	if err != nil {
		return "", fmt.Errorf("git plain open: %w", err)
	}

	w, err := r.Worktree()
	if err != nil {
		return "", fmt.Errorf("get worktree: %w", err)
	}

	status, err := w.Status()
	if err != nil {
		return "", fmt.Errorf("get status: %w", err)
	}

	if len(status) == 0 {
		// No changes to commit
		// Get HEAD hash
		ref, err := r.Head()
		if err != nil {
			return "", fmt.Errorf("get head reference: %w", err)
		}
		return ref.Hash().String(), nil
	}

	for file := range status {
		_, err = w.Add(file)
		if err != nil {
			return "", fmt.Errorf("adding file %s: %w", file, err)
		}
	}

	hash, err := w.Commit(message, &git.CommitOptions{
		Author: &object.Signature{
			Name:  "DocSmith",
			Email: "docsmith@example.com",
			When:  time.Now(),
		},
	})
	
	if err != nil {
		return "", fmt.Errorf("committing changes: %w", err)
	}
	
	return hash.String(), nil
}

func GetDocumentContentAtVersion(repoPath string, docPath string, commitHash string) (string, error) {
	r, err := git.PlainOpen(repoPath)
	if err != nil {
		return "", fmt.Errorf("git plain open: %w", err)
	}

	// Get the commit
	hash := plumbing.NewHash(commitHash)
	commit, err := r.CommitObject(hash)
	if err != nil {
		return "", fmt.Errorf("get commit object: %w", err)
	}

	// Get the file from that commit
	relativePath, err := filepath.Rel(repoPath, docPath)
	if err != nil {
		return "", fmt.Errorf("get relative path: %w", err)
	}

	file, err := commit.File(relativePath)
	if err != nil {
		return "", fmt.Errorf("get file at commit: %w", err)
	}

	// Get the content
	content, err := file.Contents()
	if err != nil {
		return "", fmt.Errorf("get file contents: %w", err)
	}

	return content, nil
}