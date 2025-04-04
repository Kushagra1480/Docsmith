package api

import (
	"database/sql"
	"docsmith/ws"
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Update your SetupRouter function with these new routes

func SetupRouter(db *sql.DB, gitRepoPath string) *gin.Engine {
	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Initialize random seed for share ID generation
	rand.Seed(time.Now().UnixNano())

	// Public routes
	router.POST("/api/register", registerHandler(db))
	router.POST("/api/login", loginHandler(db))
	
	// Public shared document route (accessible without login)
	router.GET("/api/shared/:shareId", getDocumentByShareHandler(db))

	// WebSocket endpoint (we'll now validate access within the handler)
	router.GET("/ws", func(c *gin.Context) {
		// Get document ID from query param
		docID := c.Query("docId")
		if docID == "" {
			c.String(http.StatusBadRequest, "Missing document ID")
			return
		}
		
		// Setup hub if it doesn't exist
		hub := ws.GetOrCreateHub(docID)
		ws.ServeWs(hub, c.Writer, c.Request)
	})

	// Protected routes
	auth := router.Group("/api")
	auth.Use(authMiddleware(db))
	{
		// Document CRUD operations
		auth.GET("/documents", getDocumentsHandler(db))
		auth.GET("/documents/:id", getDocumentHandler(db))
		auth.POST("/documents", createDocumentHandler(db, gitRepoPath))
		auth.PUT("/documents/:id", updateDocumentHandler(db, gitRepoPath, nil))
		auth.DELETE("/documents/:id", deleteDocumentHandler(db, gitRepoPath))
		
		// Document version management
		auth.GET("/documents/:id/versions", getDocumentVersionsHandler(gitRepoPath))
		auth.POST("/documents/:id/versions", createDocumentVersionHandler(db, gitRepoPath))
		auth.POST("/documents/:id/versions/:versionId/restore", restoreDocumentVersionHandler(db, gitRepoPath))
		
		// Document sharing
		auth.POST("/documents/:id/share", shareDocumentHandler(db))
		auth.GET("/documents/:id/permissions", getDocumentPermissionsHandler(db))
	}

	return router
}