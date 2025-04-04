import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DocumentPreview from './DocumentPreview';
import api from '../services/api';
import { connectToDocument, sendDocumentUpdate, disconnectWebSocket } from '../services/websocket';

function SharedDocument() {
  const { shareId } = useParams();
  const [document, setDocument] = useState(null);
  const [shareInfo, setShareInfo] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveTimeout, setSaveTimeout] = useState(null);
  const [anonymous, setAnonymous] = useState(true);
  const [username, setUsername] = useState('');

  // Load the shared document
  useEffect(() => {
    async function loadSharedDocument() {
      if (!shareId || shareId === 'undefined') {
        setError('Invalid share link');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await api.get(`shared/${shareId}`);
        const { document: doc, share_info: info } = response.data;
        
        setDocument(doc);
        setShareInfo(info);
        setTitle(doc.title);
        setContent(doc.content);
        
        // Generate anonymous username if needed
        if (!localStorage.getItem('anonymous_username')) {
          const randomName = generateRandomName();
          localStorage.setItem('anonymous_username', randomName);
        }
        
        setUsername(localStorage.getItem('anonymous_username'));
        
        // Connect to WebSocket for collaboration
        const params = new URLSearchParams({
          username: localStorage.getItem('anonymous_username')
        }).toString();
        
        // Setup WebSocket connection
        const socket = connectToDocument(
          doc.id,
          handleDocumentUpdate,
          params
        );
        
      } catch (err) {
        setError('This share link is invalid or has expired');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadSharedDocument();
    
    // Cleanup WebSocket on unmount
    return () => {
      disconnectWebSocket();
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [shareId]);

  function handleDocumentUpdate(data) {
    if (data.title) setTitle(data.title);
    if (data.content) setContent(data.content);
    
    // Update collaborators list
    if (data.type === 'user_joined' || data.type === 'user_left') {
      updateCollaborators(data);
    }
  }
  
  function updateCollaborators(data) {
    if (data.type === 'user_joined') {
      setCollaborators(prev => [...prev.filter(u => u.id !== data.user_id), {
        id: data.user_id,
        name: data.username,
        isAnonymous: data.is_anonymous
      }]);
    } else if (data.type === 'user_left') {
      setCollaborators(prev => prev.filter(u => u.id !== data.user_id));
    }
  }

  function handleContentChange(e) {
    if (!shareInfo?.can_edit) return;
    
    setContent(e.target.value);
    
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    setSaveTimeout(
      setTimeout(() => {
        sendDocumentUpdate(document.id, title, e.target.value);
      }, 1000)
    );
  }

  function handleTitleChange(e) {
    if (!shareInfo?.can_edit) return;
    
    setTitle(e.target.value);
    
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    setSaveTimeout(
      setTimeout(() => {
        sendDocumentUpdate(document.id, e.target.value, content);
      }, 1000)
    );
  }

  // Generate a random name for anonymous users (similar to backend)
  function generateRandomName() {
    const adjectives = [
      'Happy', 'Creative', 'Energetic', 'Thoughtful', 'Curious',
      'Brave', 'Bright', 'Calm', 'Swift', 'Wise',
    ];
    
    const nouns = [
      'Writer', 'Reader', 'Thinker', 'Explorer', 'Creator',
      'Editor', 'Scholar', 'Visitor', 'Guest', 'User',
    ];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}${noun}`;
  }

  if (loading) {
    return <div className="loading">Loading shared document...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="content">
      <div className="editor-container">
        <div className="editor-panel">
          <div className="editor-header">
            <input
              type="text"
              className="doc-title"
              value={title}
              onChange={handleTitleChange}
              disabled={!shareInfo?.can_edit}
              placeholder="Document Title"
            />
            <div className="share-info">
              <span className="permission-badge">
                {shareInfo?.can_edit ? 'Can Edit' : 'View Only'}
              </span>
              <div className="collaborators">
                {collaborators.map(user => (
                  <div key={user.id} className="collaborator-badge">
                    {user.name}
                    {user.isAnonymous && ' (Guest)'}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <textarea
            className="editor-textarea"
            value={content}
            onChange={handleContentChange}
            disabled={!shareInfo?.can_edit}
            placeholder="This document is empty..."
          />
        </div>
        
        <DocumentPreview content={content} />
      </div>
    </div>
  );
}

export default SharedDocument;