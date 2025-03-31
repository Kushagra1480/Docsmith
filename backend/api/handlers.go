package api

import (
	"database/sql"
	"fmt"
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
		
		err := db.QueryRow("select id, user_d, title, content, updated_at from docs where id = ?", docID).
			Scan(&doc.ID, &doc.UserID, &doc.Title, &doc.Content, &doc.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
			return 
		}
		if doc.UserID != userID {
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

		err = db.QueryRow("select user_d from docs where id = ?", docID).
			Scan(&existingDoc.UserID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
			return
		}
		if existingDoc.UserID != userID {
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

		message := &ws.Message {
			Type: "update",
			Data: map[string]interface{}{
				"id": docID,
				"title": req.Title,
				"content": req.Content,
				"user_id": userID,
			},
		} 

		hub.Broadcast <- message

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


		err = db.QueryRow("select user_d from docs where id = ?", docID).
			Scan(&existingDoc.UserID, &existingDoc.Title)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
			return
		}
		if existingDoc.UserID != userID {
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



