import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '../../contexts/DocumentContext';

function DocumentList() {
  const { documents, loading, error, loadDocuments, loadDocument } = useDocuments();
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, []);

  async function handleDocumentClick(id) {
    await loadDocument(id);
    navigate(`/documents/${id}`);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
  }

  function getInitialLetter(title) {
    return title.charAt(0).toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-150"></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-300"></div>
          <span className="ml-2 text-sm text-gray-600">Loading documents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 mt-4 text-sm text-red-700 bg-red-100 rounded-md">
        <div className="flex">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <h2 className="flex items-center pb-4 mb-4 text-lg font-medium text-gray-800 border-b border-gray-200">
        <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        Your Documents
      </h2>
      
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 mt-4 bg-gray-50 rounded-lg">
          <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 className="mt-2 text-gray-500">No documents yet</h3>
          <p className="mt-1 text-sm text-gray-400">Create your first document to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="relative flex flex-col p-4 bg-white border border-gray-200 rounded-lg cursor-pointer group hover:border-blue-500 hover:shadow-sm transition-all duration-200"
              onClick={() => handleDocumentClick(doc.id)}
            >
              <div className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-md bg-gradient-to-br from-blue-400 to-blue-500 text-white font-medium opacity-75">
                {getInitialLetter(doc.title)}
              </div>
              
              <h3 className="mb-2 text-lg font-medium text-gray-800 pr-8 line-clamp-1 group-hover:text-blue-600 transition-colors duration-200">{doc.title}</h3>
              
              <div className="flex items-center mt-auto text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Updated: {formatDate(doc.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentList;