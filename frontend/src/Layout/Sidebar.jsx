import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '../context/DocumentContext';

function Sidebar() {
  const { documents, addDocument, loadDocument, currentDocument } = useDocuments();
  const navigate = useNavigate();

  async function handleAddDocument() {
    const newDoc = await addDocument('Untitled Document');
    if (newDoc) {
      navigate(`/documents/${newDoc.id}`);
    }
  }

  async function handleDocumentClick(id) {
    await loadDocument(id);
    navigate(`/documents/${id}`);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
  }

  // Function to truncate long titles
  function truncateTitle(title, maxLength = 22) {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  }

  return (
    <div className="w-64 h-full overflow-hidden flex flex-col bg-gray-50 border-r border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-white">
        <button 
          onClick={handleAddDocument} 
          className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-teal-400 rounded-md hover:from-blue-600 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
          <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          New Document
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="py-2 px-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">My Documents</h2>
        </div>
        
        {!documents || documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 py-5 text-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p className="mt-1 text-xs text-gray-500">No documents yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`flex flex-col px-3 py-2 text-sm rounded-md cursor-pointer transition-colors duration-150 ${
                  currentDocument && currentDocument.id === doc.id 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => handleDocumentClick(doc.id)}
              >
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span className="font-medium truncate">{truncateTitle(doc.title)}</span>
                </div>
                <span className="mt-1 text-xs text-gray-500 pl-6">
                  {formatDate(doc.updated_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;