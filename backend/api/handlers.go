package api

import (
	"database/sql"
	"fmt"
	"math/rand"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"docsmith/git"
	"docsmith/models"
	"docsmith/ws"
)

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type CreateDocumentRequest struct {
	Title string `json:"title" binding:"required"`
	Content string `json:"content"`
}

type UpdateDocumentRequest struct {
	Title string `json:"title" binding:"required"`
	Content string `json:"content"`
}

type CreateVersionRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
	Comment string `json:"comment"`
}

func registerHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var count int
		err := db.QueryRow("select count(*) from users where username = ?", req.Username).Scan(&count)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return 
		}

		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "account already exists"})
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid credentials"})
			return
		}

		result, err := db.Exec("insert into users (username, password_hash) values (?, ?)", 
			req.Username, string(hashedPassword))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
			return
		}

		userID, _ := result.LastInsertId()
		token, err := generateToken(int(userID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"token": token, "user_id": userID, "username": req.Username})
	}
}

func loginHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var user models.User
		err := db.QueryRow("select id, username, password_hash from users where username = ?", req.Username).Scan(
			&user.ID, &user.Username, &user.PasswordHash)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return 
		}

		err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
			return
		}

		token, err := generateToken(int(user.ID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"token": token, "user_id": user.ID, "username": user.Username})
	}
}

func getDocumentsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		
		rows, err := db.Query("select id, title, updated_at from docs where user_id = ? order by updated_at desc", userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch documents"})
			return 
		}

		defer rows.Close()

		var documents []models.Document

		for rows.Next() {
			var doc models.Document
			if err := rows.Scan(&doc.ID, &doc.Title, &doc.UpdatedAt); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan documents"})
				return
			}
			documents = append(documents, doc)
		}

		c.JSON(http.StatusOK, documents)
	}
}

func getDocumentHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		docID := c.Param("id")
		
		var doc models.Document
		
		err := db.QueryRow("select id, user_id, title, content, updated_at from docs where id = ?", docID).
			Scan(&doc.ID, &doc.UserID, &doc.Title, &doc.Content, &doc.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
			return 
		}
		
		// Convert both to strings for comparison
		userIDStr := fmt.Sprintf("%v", userID)
		docUserIDStr := fmt.Sprintf("%v", doc.UserID)
		
		if docUserIDStr != userIDStr {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}

		c.JSON(http.StatusOK, doc)
	}
}

func createDocumentHandler(db *sql.DB, gitRepoPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		var req CreateDocumentRequest
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		now := time.Now()

		result, err := db.Exec("insert into docs (user_id, title, content, updated_at) values (?, ?, ?, ?)", 
			userID, req.Title, req.Content, now)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create document"})
			return
		}
		docID, _ := result.LastInsertId()
		docPath := filepath.Join(gitRepoPath, fmt.Sprintf("%d.md", docID))
		if err := git.SaveDocument(docPath, req.Content); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save document to git"})
			return
		}

		if err := git.CommitChanges(gitRepoPath, fmt.Sprintf("Create document: %s", req.Title)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit changes"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"id": docID,
			"user_id": userID,
			"title": req.Title,
			"content": req.Content,
			"updated_at": now,
		})
	}
}

func updateDocumentHandler(db *sql.DB, gitRepoPath string, hub *ws.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {

		
		userID, _ := c.Get("userID")
		docID := c.Param("id")

		id, err := strconv.Atoi(docID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid document id"})
			return
		}
		
		var req UpdateDocumentRequest
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var existingDoc models.Document

		err = db.QueryRow("select user_id from docs where id = ?", docID).
			Scan(&existingDoc.UserID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
			return
		}
		userIDStr := fmt.Sprintf("%v", userID)
		docUserIDStr := fmt.Sprintf("%v", existingDoc.UserID)
		if userIDStr != docUserIDStr {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}
		now := time.Now()

		_, err = db.Exec("update docs set title = ?, content = ?, updated_at = ? where id = ?", req.Title, req.Content, now, docID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "failed to update document"})
			return
		}
		docPath := filepath.Join(gitRepoPath, fmt.Sprintf("%d.md", id))
		if err := git.SaveDocument(docPath, req.Content); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save document to git"})
			return
		}

		if err := git.CommitChanges(gitRepoPath, fmt.Sprintf("Create document: %s", req.Title)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit changes"})
			return
		}

		if hub != nil {
            message := &ws.Message{
                Type: "update",
                Data: map[string]interface{}{
                    "id":       id,
                    "title":    req.Title,
                    "content":  req.Content,
                    "user_id":  userID,
                },
            }
            hub.Broadcast <- message
        }

		c.JSON(http.StatusCreated, gin.H{
			"id": docID,
			"user_id": userID,
			"title": req.Title,
			"content": req.Content,
			"updated_at": now,
		})
	}
}

func deleteDocumentHandler(db *sql.DB, gitRepoPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		docID := c.Param("id")

		id, err := strconv.Atoi(docID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid document id"})
			return
		}
				
		var existingDoc models.Document


		err = db.QueryRow("select user_id, title from docs where id = ?", docID).
			Scan(&existingDoc.UserID, &existingDoc.Title)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
			return
		}

		
		userIDStr := fmt.Sprintf("%v", userID)
		docUserIDStr := fmt.Sprintf("%v", existingDoc.UserID)

		if userIDStr != docUserIDStr {
			c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
			return
		}

		_, err = db.Exec("delete from docs where id = ?", docID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
			return
		}
		docPath := filepath.Join(gitRepoPath, fmt.Sprintf("%d.md", id))
		if err := git.DeleteDocument(docPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete document from git"})
			return
		}

		if err := git.CommitChanges(gitRepoPath, fmt.Sprintf("Delete document: %s", existingDoc.Title)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit changes"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "document deleted sucdessfully"})
	}
}

func getDocumentHistoryHandler(gitRepoPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		docID := c.Param("id")

		id, err := strconv.Atoi(docID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid document id"})
			return
		}
		docPath := filepath.Join(gitRepoPath, fmt.Sprintf("%d.md", id))
		history, err := git.GetDocumentHistory(gitRepoPath, docPath)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch document history"})
			return
		}

		c.JSON(http.StatusOK, history)
	}
}
func createDocumentVersionHandler(db *sql.DB, gitRepoPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		docID := c.Param("id")
		
		id, err := strconv.Atoi(docID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
			return
		}

		var req CreateVersionRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var existingDoc models.Document
		err = db.QueryRow("SELECT user_id FROM docs WHERE id = ?", docID).
			Scan(&existingDoc.UserID)
		
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
			return
		}

		userIDStr := fmt.Sprintf("%v", userID)
		docUserIDStr := fmt.Sprintf("%v", existingDoc.UserID)

		if userIDStr != docUserIDStr {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		// Update the document in the database
		now := time.Now()
		_, err = db.Exec("UPDATE docs SET title = ?, content = ?, updated_at = ? WHERE id = ?",
			req.Title, req.Content, now, docID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update document"})
			return
		}

		// Save to git and commit with the provided comment
		docPath := filepath.Join(gitRepoPath, fmt.Sprintf("%d.md", id))
		if err := git.SaveDocument(docPath, req.Content); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document to git"})
			return
		}

		commitMessage := req.Comment
		if commitMessage == "" {
			commitMessage = fmt.Sprintf("Update document: %s", req.Title)
		}

		commitHash, err := git.CommitChangesWithHash(gitRepoPath, commitMessage)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":         id,
			"hash":       commitHash,
			"user_id":    userID,
			"title":      req.Title,
			"content":    req.Content,
			"message":    commitMessage,
			"updated_at": now,
		})
	}
}

type ShareDocumentRequest struct {
	CanEdit bool `json:"canEdit"`
}

type ShareDocumentResponse struct {
	URL      string `json:"url"`
	DocID    int    `json:"docId"`
	ShareID  string `json:"shareId"`
	CanEdit  bool   `json:"canEdit"`
	ExpireAt time.Time `json:"expireAt"`
}

func generateShareID() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const length = 10
	
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

func getDocumentByShareHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		shareID := c.Param("shareId")
		
		var docID int
		var canEdit bool
		var expireAt time.Time
		
		err := db.QueryRow(
			"SELECT doc_id, can_edit, expire_at FROM doc_shares WHERE share_id = ?", 
			shareID).Scan(&docID, &canEdit, &expireAt)
		
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Share link not found or expired"})
			return
		}
		
		// Check if share link is expired
		if time.Now().After(expireAt) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Share link has expired"})
			return
		}
		
		// Get document data
		var doc models.Document
		err = db.QueryRow(
			"SELECT id, title, content, updated_at FROM docs WHERE id = ?", 
			docID).Scan(&doc.ID, &doc.Title, &doc.Content, &doc.UpdatedAt)
		
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{
			"document": doc,
			"share_info": gin.H{
				"can_edit": canEdit,
				"expire_at": expireAt,
			},
		})
	}
}

func getDocumentPermissionsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		docID := c.Param("id")
		
		var ownerID int
		err := db.QueryRow("SELECT user_id FROM docs WHERE id = ?", docID).Scan(&ownerID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
			return
		}
		
		// Check if user is owner
		isOwner := (ownerID == userID)
		
		// Get list of shares
		rows, err := db.Query(
			"SELECT share_id, can_edit, created_by, expire_at FROM doc_shares WHERE doc_id = ?", 
			docID)
		
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch document permissions"})
			return
		}
		defer rows.Close()
		
		var shares []gin.H
		for rows.Next() {
			var shareID string
			var canEdit bool
			var createdBy int
			var expireAt time.Time
			
			if err := rows.Scan(&shareID, &canEdit, &createdBy, &expireAt); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan share data"})
				return
			}
			
			// Get creator username
			var creatorName string
			err := db.QueryRow("SELECT username FROM users WHERE id = ?", createdBy).Scan(&creatorName)
			if err != nil {
				creatorName = "Unknown user"
			}
			
			shares = append(shares, gin.H{
				"share_id": shareID,
				"can_edit": canEdit,
				"created_by": gin.H{
					"id": createdBy,
					"username": creatorName,
				},
				"expire_at": expireAt,
			})
		}
		
		// Get active collaborators
		var collaborators []gin.H
		// This would typically be populated from an active sessions table
		// or from WebSocket connections, but we'll leave it empty for simplicity
		
		c.JSON(http.StatusOK, gin.H{
			"is_owner": isOwner,
			"owner_id": ownerID,
			"shares": shares,
			"collaborators": collaborators,
		})
	}
}


func getDocumentVersionsHandler(gitRepoPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		docID := c.Param("id")
		
		id, err := strconv.Atoi(docID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
			return
		}

		docPath := filepath.Join(gitRepoPath, fmt.Sprintf("%d.md", id))
		history, err := git.GetDocumentHistory(gitRepoPath, docPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch document versions"})
			return
		}

		c.JSON(http.StatusOK, history)
	}
}

func restoreDocumentVersionHandler(db *sql.DB, gitRepoPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		docID := c.Param("id")
		versionHash := c.Param("versionId")
		
		id, err := strconv.Atoi(docID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
			return
		}

		var existingDoc models.Document
		err = db.QueryRow("SELECT user_id FROM docs WHERE id = ?", docID).
			Scan(&existingDoc.UserID)
		
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
			return
		}

		if existingDoc.UserID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		// Get the content from the specified version
		docPath := filepath.Join(gitRepoPath, fmt.Sprintf("%d.md", id))
		content, err := git.GetDocumentContentAtVersion(gitRepoPath, docPath, versionHash)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve version content"})
			return
		}

		// Get the current document title
		var title string
		err = db.QueryRow("SELECT title FROM docs WHERE id = ?", docID).Scan(&title)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get document title"})
			return
		}

		// Update the document in database with version content
		now := time.Now()
		_, err = db.Exec("UPDATE docs SET content = ?, updated_at = ? WHERE id = ?",
			content, now, docID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update document"})
			return
		}

		// Save to git and create a new commit indicating restoration
		if err := git.SaveDocument(docPath, content); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document to git"})
			return
		}

		commitMessage := fmt.Sprintf("Restored document '%s' to version %s", title, versionHash[:7])
		newHash, err := git.CommitChangesWithHash(gitRepoPath, commitMessage)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":         id,
			"hash":       newHash,
			"restored_from": versionHash,
			"title":      title,
			"content":    content,
			"message":    commitMessage,
			"updated_at": now,
		})
	}
}

func shareDocumentHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")
		docID := c.Param("id")
		
		id, err := strconv.Atoi(docID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
			return
		}

		var req ShareDocumentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var existingDoc models.Document
		err = db.QueryRow("SELECT user_id FROM docs WHERE id = ?", docID).
			Scan(&existingDoc.UserID)
		
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
			return
		}

		userIDStr := fmt.Sprintf("%v", userID)
		docUserIDStr := fmt.Sprintf("%v", existingDoc.UserID)

		if userIDStr != docUserIDStr {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}

		// Generate a unique share ID
		shareID := generateShareID()
		
		// Set expiration time (30 days from now)
		expireAt := time.Now().AddDate(0, 1, 0)
		
		// Save share information to database
		_, err = db.Exec(
			"INSERT INTO doc_shares (doc_id, share_id, can_edit, created_by, expire_at) VALUES (?, ?, ?, ?, ?)",
			id, shareID, req.CanEdit, userID, expireAt)
		
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create share link"})
			return
		}

		// Generate shareable URL
		shareURL := fmt.Sprintf("http://localhost:3000/shared/%s", shareID)

		response := ShareDocumentResponse{
			URL:      shareURL,
			DocID:    id,
			ShareID:  shareID,
			CanEdit:  req.CanEdit,
			ExpireAt: expireAt,
		}

		c.JSON(http.StatusOK, response)
	}
}