const WS_URL = 'ws://localhost:8080/ws';
let activeSocket = null;
let reconnectTimeout = null;

// Only connect to the WebSocket when actively collaborating
export function connectToDocument(documentId, onUpdateCallback) {
  if (activeSocket) {
    disconnectWebSocket();
  }
  
  const socket = new WebSocket(`${WS_URL}?docId=${documentId}`);
  
  socket.onopen = () => {
    console.log('WebSocket connection established for document:', documentId);
    socket.send(JSON.stringify({ 
      type: 'join', 
      data: { documentId }
    }));
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  socket.onclose = (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
    if (event.code !== 1000) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        connectToDocument(documentId, onUpdateCallback);
      }, 3000);
    }
  };
  
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'update' && message.data && onUpdateCallback) {
        onUpdateCallback(message.data);
      }
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
    }
  };
  
  activeSocket = socket;
  return socket;
}

export function disconnectWebSocket() {
  if (activeSocket) {
    clearTimeout(reconnectTimeout);
    
    if (activeSocket.readyState === WebSocket.OPEN) {
      activeSocket.close(1000);
    }
    
    activeSocket = null;
  }
}

export function sendDocumentUpdate(documentId, title, content) {
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
    activeSocket.send(JSON.stringify({
      type: 'update',
      data: {
        id: documentId,
        title,
        content
      }
    }));
    return true;
  }
  return false;
}