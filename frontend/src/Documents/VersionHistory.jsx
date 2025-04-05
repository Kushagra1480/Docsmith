import React, { useState } from 'react';
import { restoreDocumentVersion } from '../services/document';

function VersionHistory({ versions, documentId, onClose }) {
  const [selectedVersion, setSelectedVersion] = useState(null);

  async function handleRestoreVersion(versionId) {
    if (window.confirm('Are you sure you want to restore this version?')) {
      try {
        await restoreDocumentVersion(documentId, versionId);
        window.location.reload(); // Reload to show the restored version
      } catch (error) {
        console.error('Failed to restore version:', error);
        alert('Failed to restore version');
      }
    }
  }

  // Function to get a shortened hash (like Git)
  const getShortHash = (hash) => {
    return hash.substring(0, 7);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg w-full max-w-4xl mx-auto my-4 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-400 text-white">
        <h3 className="text-lg font-medium">Git Version History</h3>
        <button 
          className="flex items-center justify-center w-6 h-6 text-white rounded-full hover:bg-white hover:bg-opacity-20 focus:outline-none transition-colors" 
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="p-6">
        {versions.length === 0 ? (
          <div className="text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No version history available</p>
          </div>
        ) : (
          <div className="flex">
            {/* Tree visualization on the left */}
            <div className="pr-6 w-16">
              <div className="relative h-full">
                {/* Main vertical line */}
                <div className="absolute left-4 top-3 bottom-0 w-0.5 bg-gray-300"></div>
                
                {/* Nodes */}
                {versions.map((version, index) => (
                  <div key={`node-${version.hash}`} className="relative" style={{ height: '60px' }}>
                    <div 
                      className={`absolute left-2.5 top-3 w-3 h-3 rounded-full border-2 border-gray-300 z-10 
                        ${selectedVersion === version.hash ? 'bg-blue-500 border-blue-500' : 'bg-white'}`}
                      onClick={() => setSelectedVersion(version.hash)}
                    ></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commit list on the right */}
            <div className="flex-1 overflow-y-auto max-h-96">
              {versions.map((version, index) => (
                <div 
                  key={version.hash}
                  className={`mb-4 p-3 border rounded-md cursor-pointer transition-colors
                    ${selectedVersion === version.hash ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setSelectedVersion(version.hash)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{version.message}</p>
                      <div className="mt-1.5 flex items-center text-xs text-gray-500">
                        <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                          {getShortHash(version.hash)}
                        </span>
                        <span className="mx-2">•</span>
                        <span>{version.author}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(version.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {selectedVersion === version.hash && (
                      <div className="ml-4 flex-shrink-0">
                        <button 
                          onClick={() => handleRestoreVersion(version.hash)}
                          className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          Restore this version
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {selectedVersion === version.hash && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex space-x-4 text-xs">
                        <div>
                          <span className="block text-gray-500">Created</span>
                          <span className="text-gray-700">{new Date(version.timestamp).toLocaleString()}</span>
                        </div>
                        {version.parentHash && (
                          <div>
                            <span className="block text-gray-500">Parent</span>
                            <span className="font-mono text-gray-700">{getShortHash(version.parentHash)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VersionHistory;