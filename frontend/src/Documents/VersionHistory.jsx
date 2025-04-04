import React from 'react';
import { restoreDocumentVersion } from '../services/document';

function VersionHistory({ versions, documentId, onClose }) {
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

  return (
    <div className="version-history-panel">
      <div className="panel-header">
        <h3>Document Version History</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      
      {versions.length === 0 ? (
        <p>No version history available</p>
      ) : (
        <ul className="version-list">
          {versions.map((version) => (
            <li key={version.hash} className="version-item">
              <div className="version-info">
                <div className="version-message">{version.message}</div>
                <div className="version-meta">
                  {version.author} - {new Date(version.timestamp).toLocaleString()}
                </div>
              </div>
              <div className="version-actions">
                <button 
                  onClick={() => handleRestoreVersion(version.hash)}
                  className="button small"
                >
                  Restore
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default VersionHistory;