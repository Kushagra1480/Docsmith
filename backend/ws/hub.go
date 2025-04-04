package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	// Add document-specific metadata
	DocumentID string
	UserID     string
	Username   string
	IsAnonymous bool
}
type Message struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

type Hub struct {
	// Document ID this hub is for
	DocumentID string
	// Map of connected clients
	clients    map[*Client]bool
	// Channel for outgoing messages
	Broadcast  chan *Message
	// Channel for registering clients
	register   chan *Client
	// Channel for unregistering clients
	unregister chan *Client
	// Protect the clients map during concurrent access
	mutex      sync.Mutex
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}
func NewHub(documentID string) *Hub {
	return &Hub{
		DocumentID: documentID,
		clients:    make(map[*Client]bool),
		Broadcast:  make(chan *Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}


var documentHubs = make(map[string]*Hub)
var hubsMutex sync.Mutex


func GetOrCreateHub(documentID string) *Hub {
	hubsMutex.Lock()
	defer hubsMutex.Unlock()
	
	hub, exists := documentHubs[documentID]
	if !exists {
		hub = NewHub(documentID)
		documentHubs[documentID] = hub
		go hub.Run()
	}
	
	return hub
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			// Notify others that someone joined
			if client.Username != "" {
				h.notifyClientJoined(client)
			}
			h.mutex.Unlock()
			
		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				// Notify others that someone left
				if client.Username != "" {
					h.notifyClientLeft(client)
				}
			}
			
			// If no clients left, remove this hub
			if len(h.clients) == 0 {
				hubsMutex.Lock()
				delete(documentHubs, h.DocumentID)
				hubsMutex.Unlock()
			}
			h.mutex.Unlock()
			
		case message := <-h.Broadcast:
			msgJSON, err := json.Marshal(message)
			if err != nil {
				log.Printf("Error marshaling message: %v", err)
				continue
			}
			
			h.mutex.Lock()
			for client := range h.clients {
				select {
				case client.send <- msgJSON:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mutex.Unlock()
		}
	}
}
// In client.readPump()
func (c *Client) readPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()
    
    c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
        return nil
    })
    
    for {
        _, message, err := c.conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("WebSocket read error: %v", err)
            }
            break
        }
        
        var msg Message
        if err := json.Unmarshal(message, &msg); err != nil {
            log.Printf("Error unmarshaling message: %v", err)
            continue
        }
        
        // Handle ping messages
        if msg.Type == "ping" {
            // Just ignore ping messages, they're just keeping the connection alive
            continue
        }
        
        c.hub.Broadcast <- &msg
    }
}

func (c *Client) writePump() {
	defer func() {
		c.conn.Close()
	}()

	for {
		message, ok := <-c.send
		if !ok {
			c.conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}

		if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			return
		}
	}
}

// In ws/hub.go

// Add this to the ServeWs function
func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
    upgrader.CheckOrigin = func(r *http.Request) bool {
        return true
    }
    
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("Error upgrading WebSocket:", err)
        return
    }
    
    client := &Client{
        hub:  hub,
        conn: conn,
        send: make(chan []byte, 256),
    }
    
    client.hub.register <- client
    
    // Handle ping messages to keep connection alive
    conn.SetPingHandler(func(string) error {
        conn.WriteMessage(websocket.PongMessage, []byte{})
        return nil
    })
    
    go client.writePump()
    go client.readPump()
}

// Add these methods to the Hub struct in hub.go

// notifyClientJoined informs all clients that a new client has joined
func (h *Hub) notifyClientJoined(client *Client) {
	message := &Message{
		Type: "user_joined",
		Data: map[string]interface{}{
			"user_id": client.UserID,
			"username": client.Username,
			"is_anonymous": client.IsAnonymous,
			"document_id": h.DocumentID,
		},
	}
	
	msgJSON, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling join message: %v", err)
		return
	}
	
	h.mutex.Lock()
	defer h.mutex.Unlock()
	
	for c := range h.clients {
		if c != client { // Don't notify the client who just joined
			select {
			case c.send <- msgJSON:
			default:
				close(c.send)
				delete(h.clients, c)
			}
		}
	}
}

// notifyClientLeft informs all clients that a client has left
func (h *Hub) notifyClientLeft(client *Client) {
	message := &Message{
		Type: "user_left",
		Data: map[string]interface{}{
			"user_id": client.UserID,
			"username": client.Username,
			"document_id": h.DocumentID,
		},
	}
	
	msgJSON, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling leave message: %v", err)
		return
	}
	
	h.mutex.Lock()
	defer h.mutex.Unlock()
	
	for c := range h.clients {
		select {
		case c.send <- msgJSON:
		default:
			close(c.send)
			delete(h.clients, c)
		}
	}
}