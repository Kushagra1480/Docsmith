package api

import (
	"database/sql"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter(db *sql.DB, gitRepoPath string) *gin.Engine {
	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders: []string{"Content-Length"},
		AllowCredentials: true,
	}))

	hub := ws.NewHub()
	go hub.Run()

	router.POST("/api/register", registerHandler(db))
	router.POST("/api/login", loginHandler(db))

	auth := router.Group("/api")
	auth.Use(authMiddleware(db)) 
	{
		auth.GET("/documents", getDocumentsHandler(db))
		auth.GET("/documents/:id", getDocumentHandler(db))
		auth.POST("/documents", createDocumentHandler(db, gitRepoPath))
		auth.PUT("/documents/:id", updateDocumentHandler(db, gitRepoPath, hub))
		auth.DELETE("/documents/:id", deleteDocumentHandler(db, gitRepoPath))
		auth.GET("/documents/:id/history", getDocumentHistoryHandler(gitRepoPath))
	}

	router.GET("/ws", func (c *gin.Context) {
		ws.ServeWs(hub, c.Writer, c.Request)
	})
	return router
}