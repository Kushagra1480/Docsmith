import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { debounce } from 'lodash';
import Sidebar from '../Layout/Sidebar';
import VersionHistory from './VersionHistory';
import ShareDocument from './SharedDocument';
import { useDocuments } from '../context/DocumentContext';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import Notification from '../Notificaton';

const LivePreview = Extension.create({
  name: 'livePreview',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('livePreview'),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, set, oldState, newState) {
            const doc = newState.doc;
            let decorations = [];

            doc.descendants((node, pos) => {
              if (node.isText) {
                // Handle bold
                if (node.marks.some(mark => mark.type.name === 'bold')) {
                  const start = pos;
                  const end = pos + node.nodeSize;
                  const text = node.text;
                  const match = text.match(/^\*\*(.+)\*\*$/);
                  if (match) {
                    const content = match[1];
                    decorations.push(
                      Decoration.inline(start + 2, end - 2, { style: 'font-weight: bold;' }),
                      Decoration.inline(start, start + 2, { style: 'opacity: 0.3; transition: opacity 0.2s;' }),
                      Decoration.inline(end - 2, end, { style: 'opacity: 0.3; transition: opacity 0.2s;' })
                    );
                  } else {
                    decorations.push(
                      Decoration.inline(start, end, { style: 'font-weight: bold;' })
                    );
                  }
                }
                // Handle italic
                if (node.marks.some(mark => mark.type.name === 'italic')) {
                  const start = pos;
                  const end = pos + node.nodeSize;
                  const text = node.text;
                  const match = text.match(/^\*(.+)\*$/);
                  if (match) {
                    const content = match[1];
                    decorations.push(
                      Decoration.inline(start + 1, end - 1, { style: 'font-style: italic;' }),
                      Decoration.inline(start, start + 1, { style: 'opacity: 0.3; transition: opacity 0.2s;' }),
                      Decoration.inline(end - 1, end, { style: 'opacity: 0.3; transition: opacity 0.2s;' })
                    );
                  } else {
                    decorations.push(
                      Decoration.inline(start, end, { style: 'font-style: italic;' })
                    );
                  }
                }
                // Handle strikethrough
                if (node.marks.some(mark => mark.type.name === 'strike')) {
                  const start = pos;
                  const end = pos + node.nodeSize;
                  const text = node.text;
                  const match = text.match(/^~(.+)~$/);
                  if (match) {
                    const content = match[1];
                    decorations.push(
                      Decoration.inline(start + 1, end - 1, { style: 'text-decoration: line-through;' }),
                      Decoration.inline(start, start + 1, { style: 'opacity: 0.3; transition: opacity 0.2s;' }),
                      Decoration.inline(end - 1, end, { style: 'opacity: 0.3; transition: opacity 0.2s;' })
                    );
                  } else {
                    decorations.push(
                      Decoration.inline(start, end, { style: 'text-decoration: line-through;' })
                    );
                  }
                }
              }
              // Handle headings
              if (node.type.name === 'heading') {
                const start = pos;
                const end = pos + node.nodeSize;
                const level = node.attrs.level;
                decorations.push(
                  Decoration.node(start, end, {
                    style: `font-size: ${2 - level * 0.2}em; font-weight: bold;`,
                  })
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

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
  const [viewMode, setViewMode] = useState(false);
  const [shareInfo, setShareInfo] = useState(null);
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const [notification, setNotification] = useState({ message: '', type: 'success' }); 

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
      if (editorInstanceRef.current) {
        editorInstanceRef.current.commands.setContent(currentDocument.content, false);
      }
      if (showVersionHistory) {
        loadVersions(currentDocument.id);
      }
    } else {
      setTitle('');
      setContent('');
    }
  }, [currentDocument, showVersionHistory]);

  // Setup TipTap editor
  useEffect(() => {
    if (!viewMode && editorRef.current && !editorInstanceRef.current) {
      const debouncedSetContent = debounce((markdown) => {
        setContent(markdown);
      }, 300);

      const editor = new Editor({
        element: editorRef.current,
        extensions: [
          StarterKit,
          Markdown,
          LivePreview,
        ],
        content: content,
        onUpdate: ({ editor }) => {
          const markdown = editor.storage.markdown.getMarkdown();
          debouncedSetContent(markdown);
        },
        editorProps: {
          attributes: {
            class: 'prose prose-sm max-w-none p-4 min-h-full outline-none font-mono text-sm leading-relaxed',
          },
        },
      });

      editorInstanceRef.current = editor;
    }

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      disableCollaboration();
    };
  }, [!viewMode]);

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

  function toggleViewMode() {
    setViewMode(!viewMode);
  }

  async function handleGenerateShareLink(canEdit) {
    if (!currentDocument || !currentDocument.id) {
      console.error("Cannot share: document is undefined or missing ID");
      return;
    }
    
    try {
      const shareResponse = await generateShareLink(currentDocument.id, canEdit);
      const shareId = shareResponse.split('/').pop();
      const fullUrl = `${window.location.origin}${shareResponse}`;
      
      setShareInfo({
        url: fullUrl,
        shareId: shareId
      });
    } catch (error) {
      console.error("Error generating share link:", error);
      setNotification({ message: "Failed to generate share link", type: "error" });
    }
  }

  const handleShareIdClick = async () => {
    if (shareInfo?.url) {
      try {
        await navigator.clipboard.writeText(shareInfo.url);
        setNotification({ message: "URL copied to clipboard!", type: "success" });
      } catch (error) {
        console.error("Failed to copy URL:", error);
        setNotification({ message: "Failed to copy URL", type: "error" });
      }
    }
  };

  const clearNotification = () => {
    setNotification({ message: '', type: 'success' });
  };
  function toggleCollaboration() {
    if (!currentDocument) return;
    if (isCollaborating) {
      disableCollaboration();
    } else {
      enableCollaboration(currentDocument.id);
    }
  }

  const renderedHTML = content ? marked(content) : '';

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
                onClick={toggleViewMode}
                className={`px-4 py-2 mx-1 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${viewMode ? 'bg-gray-200' : ''}`}
                title={viewMode ? "Switch to edit mode" : "Switch to preview mode"}
              >
                {viewMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
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
                    onClick={handleGenerateShareLink} 
                    className="px-4 py-2 mx-1 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Share
                  </button>
                  {shareInfo?.shareId && (
                    <span 
                      onClick={handleShareIdClick}
                      className="px-4 py-2 mx-1 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800"
                      title="Click to copy full URL"
                    >
                      {shareInfo.shareId}
                    </span>
                  )}
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
        <Notification 
          message={notification.message}
          type={notification.type}
          onClose={clearNotification}
          duration={3000} // 3 seconds
        />

        {showVersionHistory && currentDocument && (
          <VersionHistory 
            versions={documentVersions} 
            documentId={currentDocument.id}
            onClose={() => setShowVersionHistory(false)}
          />
        )}

        <div className="flex flex-1 overflow-hidden">
          {viewMode ? (
            <div className="flex-1 p-4 overflow-auto prose prose-sm max-w-none bg-white">
              <div 
                className="markdown-preview" 
                dangerouslySetInnerHTML={{ __html: renderedHTML }}
              />
            </div>
          ) : (
            <div ref={editorRef} className="flex-1 bg-white" />
          )}
        </div>
      </div>

      <style>{`
        .font-mono {
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
        }
        .text-sm {
          font-size: 14px;
        }
        .leading-relaxed {
          line-height: 1.6;
        }
        .markdown-preview {
          font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}

export default DocumentEditor;