import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  fetchDocuments, 
  fetchDocument, 
  createDocument, 
  updateDocument, 
  deleteDocument,
  createDocumentVersion,
  fetchDocumentVersions,
  shareDocument,
  getDocumentPermissions
} from '../services/document';
import { useAuth } from './AuthContext';
import { connectToDocument, disconnectWebSocket, sendDocumentUpdate } from '../services/websocket';

const DocumentContext = createContext();

export function useDocuments() {
  return useContext(DocumentContext);
}

export function DocumentProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [documentVersions, setDocumentVersions] = useState([]);
  const [shareLink, setShareLink] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, []);
  
  async function loadDocuments() {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  async function loadDocument(id) {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      const doc = await fetchDocument(id);
      setCurrentDocument(doc);
      
      // Load document permissions if it exists
      if (doc) {
        const perms = await getDocumentPermissions(id);
        setPermissions(perms);
        
        // Check if collaboration is enabled for this document
        if (perms && perms.collaborators && perms.collaborators.length > 0) {
          enableCollaboration(id);
        }
      }
      
      return doc;
    } catch (err) {
      setError('Failed to load document');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  async function addDocument(title, content = '') {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      const newDoc = await createDocument(title, content);
      setDocuments(prev => [newDoc, ...prev]);
      setCurrentDocument(newDoc);
      return newDoc;
    } catch (err) {
      setError('Failed to create document');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  async function saveDocument(id, title, content) {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      const updatedDoc = await updateDocument(id, title, content);
      
      setCurrentDocument(updatedDoc);
      setDocuments(prev => 
        prev.map(doc => doc.id === id ? updatedDoc : doc)
      );
      
      // If collaborating, send update via WebSocket
      if (isCollaborating) {
        sendDocumentUpdate(id, title, content);
      }
      
      return updatedDoc;
    } catch (err) {
      setError('Failed to save document');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  async function removeDocument(id) {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      await deleteDocument(id);
      
      if (currentDocument && currentDocument.id === id) {
        setCurrentDocument(null);
        disconnectWebSocket();
        setIsCollaborating(false);
      }
      
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err) {
      setError('Failed to delete document');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  async function createVersion(id, title, content, comment) {
    if (!currentUser || !id) return;
    
    try {
      setLoading(true);
      setError(null);
      const version = await createDocumentVersion(id, title, content, comment);
      await loadVersions(id);
      return version;
    } catch (err) {
      setError('Failed to create document version');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  async function loadVersions(id) {
    if (!currentUser || !id) return;
    
    try {
      setLoading(true);
      setError(null);
      const versions = await fetchDocumentVersions(id);
      setDocumentVersions(versions);
      return versions;
    } catch (err) {
      setError('Failed to load document versions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  async function generateShareLink(id, canEdit = false) {
    if (!currentUser || !id) return;
    console.log("id: ", id)
    try {
      setLoading(true);
      setError(null);
      const link = await shareDocument(id, canEdit);
      setShareLink(link);
      return link;
    } catch (err) {
      setError('Failed to generate share link');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  function enableCollaboration(documentId) {
    if (!documentId) return;
    
    const handleDocumentUpdate = (data) => {
      if (data.id === documentId) {
        setCurrentDocument(prev => ({
          ...prev,
          title: data.title,
          content: data.content,
          updated_at: new Date().toISOString()
        }));
      }
    };
    
    connectToDocument(documentId, handleDocumentUpdate);
    setIsCollaborating(true);
  }
  
  function disableCollaboration() {
    disconnectWebSocket();
    setIsCollaborating(false);
  }
  
  // Load documents on initial render if user is logged in
  useEffect(() => {
    if (currentUser) {
      loadDocuments();
    }
  }, [currentUser]);

  const value = {
    documents,
    currentDocument,
    documentVersions,
    shareLink,
    permissions,
    isCollaborating,
    loading,
    error,
    loadDocuments,
    loadDocument,
    addDocument,
    saveDocument,
    removeDocument,
    createVersion,
    loadVersions,
    generateShareLink,
    enableCollaboration,
    disableCollaboration,
    setCurrentDocument
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}