import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DocumentPreview from './DocumentPreview';
import Sidebar from '../Layout/Sidebar';
import VersionHistory from './VersionHistory';
import ShareDocument from './SharedDocument';
import { useDocuments } from '../context/DocumentContext';

function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    currentDocument, 
    loadDocument, 
    saveDocument,
    createVersion,
    documentVersions,
    loadVersions,
    addDocument, 
    removeDocument,
    generateShareLink,
    shareLink,
    isCollaborating,
    enableCollaboration,
    disableCollaboration,
    loading, 
    error 
  } = useDocuments();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveTimeout, setSaveTimeout] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [versionComment, setVersionComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadDocument(id).catch(err => {
        console.error("Could not load document:", err);
        navigate('/');
      });
    }
  }, [id]);

  useEffect(() => {
    if (currentDocument) {
      setTitle(currentDocument.title);
      setContent(currentDocument.content);
      
      // Load versions if showing version history
      if (showVersionHistory) {
        loadVersions(currentDocument.id);
      }
    } else {
      setTitle('');
      setContent('');
    }
  }, [currentDocument, showVersionHistory]);

  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      
      // Clean up collaboration when component unmounts
      disableCollaboration();
    };
  }, [saveTimeout]);

  function handleContentChange(e) {
    setContent(e.target.value);
    
  }

  function handleTitleChange(e) {
    setTitle(e.target.value);
  }

  function handleTitleBlur() {
    if (currentDocument && title !== currentDocument.title) {
      handleSave();
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      if (currentDocument) {
        await saveDocument(currentDocument.id, title, content);
      } else if (title) {
        const newDoc = await addDocument(title, content);
        if (newDoc) {
          navigate(`/documents/${newDoc.id}`);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (currentDocument && window.confirm('Are you sure you want to delete this document?')) {
      await removeDocument(currentDocument.id);
      navigate('/');
    }
  }

  async function handleCreateVersion() {
    if (!currentDocument) return;
    
    await createVersion(
      currentDocument.id, 
      title, 
      content, 
      versionComment || `Version created on ${new Date().toLocaleString()}`
    );
    
    setVersionComment('');
    alert('Document version created successfully');
  }

  function toggleVersionHistory() {
    if (!showVersionHistory && currentDocument) {
      loadVersions(currentDocument.id);
    }
    setShowVersionHistory(!showVersionHistory);
  }
  
  function toggleShareDialog() {
    setShowShareDialog(!showShareDialog);
  }
  
  async function handleGenerateShareLink(canEdit) {
    if (!currentDocument || !currentDocument.id) {
      console.error("Cannot share: document is undefined or missing ID");
      setError("Cannot share document - please try reloading");
      return;
    }
    
    console.log("Attempting to share document with ID:", currentDocument.id);
    await generateShareLink(currentDocument.id, canEdit);
    toggleShareDialog();
  }
  
  function toggleCollaboration() {
    if (!currentDocument) return;
    
    if (isCollaborating) {
      disableCollaboration();
    } else {
      enableCollaboration(currentDocument.id);
    }
  }

  if (loading && !currentDocument) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse delay-150"></div>
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse delay-300"></div>
          <span className="ml-2 text-gray-600">Loading document...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <input
                type="text"
                className="w-full mr-4 text-xl font-medium bg-transparent border-none outline-none focus:outline-none placeholder-gray-400"
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                placeholder="Document Title"
              />
              <div className="flex items-center p-1 shadow-sm">
                <button 
                  onClick={handleSave} 
                  className="flex items-center px-4 py-2 mx-1 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {isSaving ? (
                    <>
                      <svg className="w-4 h-4 mr-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
                
                {currentDocument && (
                  <>
                    <button 
                      onClick={toggleVersionHistory} 
                      className={`px-4 py-2 mx-1 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${showVersionHistory ? 'bg-gray-200' : ''}`}
                    >
                      {showVersionHistory ? 'Hide History' : 'History'}
                    </button>
                    
                    <button 
                      onClick={toggleShareDialog} 
                      className="px-4 py-2 mx-1 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      Share
                    </button>
                    
                    <button 
                      onClick={toggleCollaboration} 
                      className={`px-4 py-2 mx-1 text-sm font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${isCollaborating ? 'bg-green-500 text-white hover:bg-green-600 border-transparent' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                      title={isCollaborating ? 'Collaboration enabled' : 'Enable collaboration'}
                    >
                      {isCollaborating ? 'Collaborating' : 'Collaborate'}
                    </button>
                    
                    <button 
                      onClick={handleCreateVersion} 
                      className="px-4 py-2 mx-1 text-sm font-medium text-white whitespace-nowrap bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                      title="Create a version (Git commit)"
                    >
                      Create Version
                    </button>
                    
                    <button 
                      onClick={handleDelete} 
                      className="px-4 py-2 mx-1 text-sm font-medium text-white bg-red-500 border border-transparent rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {currentDocument && (
              <div className="flex mt-2">
                <input
                  type="text"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={versionComment}
                  onChange={(e) => setVersionComment(e.target.value)}
                  placeholder="Version comment (optional)"
                />
              </div>
            )}
          </div>
          
          {showVersionHistory && currentDocument && (
            <VersionHistory 
              versions={documentVersions} 
              documentId={currentDocument.id}
              onClose={() => setShowVersionHistory(false)}
            />
          )}
          
          {showShareDialog && currentDocument && (
            <ShareDocument 
              shareLink={shareLink}
              onGenerateLink={handleGenerateShareLink}
              onClose={() => setShowShareDialog(false)}
            />
          )}
          
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 border-r border-gray-200">
              <textarea
                className="w-full h-full p-4 font-mono text-sm bg-white resize-none focus:outline-none"
                value={content}
                onChange={handleContentChange}
                placeholder="Write your markdown content here..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentEditor;