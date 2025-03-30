package models

type Document struct {
	ID string `json:"id"`
	UserID string `json:"user_id"`
	Title string `json:title"`
	Content string `json:"content"`
	UpdatedAt string `json:"updated_at"`
}