import api from './api';

export async function fetchDocuments() {
  try {
    const response = await api.get('/documents');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch documents');
  }
}

export async function fetchDocument(id) {
  try {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.warn(`Document ${id} not found`);
      throw new Error('Document not found');
    }
    throw new Error(error.response?.data?.error || 'Failed to fetch document');
  }
}

export async function createDocument(title, content = '') {
  try {
    const response = await api.post('/documents', { title, content });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to create document');
  }
}

export async function updateDocument(id, title, content) {
  try {
    const response = await api.put(`/documents/${id}`, { title, content });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to update document');
  }
}

export async function deleteDocument(id) {
  try {
    await api.delete(`/documents/${id}`);
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to delete document');
  }
}

export async function createDocumentVersion(id, title, content, comment) {
  try {
    const response = await api.post(`/documents/${id}/versions`, { 
      title, 
      content, 
      comment: comment || `Version created on ${new Date().toLocaleString()}`
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to create document version');
  }
}

export async function fetchDocumentVersions(id) {
  try {
    const response = await api.get(`/documents/${id}/versions`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch document versions');
  }
}

export async function restoreDocumentVersion(id, versionId) {
  try {
    const response = await api.post(`/documents/${id}/versions/${versionId}/restore`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to restore document version');
  }
}

export async function shareDocument(id, canEdit = false) {
  try {
    // Make sure we're only sending a simple object with the canEdit property
    const payload = { canEdit: !!canEdit };
    
    // This should match your route in the router (POST to /api/documents/:id/share)
    const response = await api.post(`documents/${id}/share`, payload);
    
    console.log("Share response:", response.data);
    
    // Return the share link
    return response.data.shareLink || `/shared/${response.data.shareId}`;
  } catch (error) {
    console.error("Error creating share link:", error);
    throw new Error(error.response?.data?.error || 'Failed to share document');
  }
}

export async function getDocumentPermissions(id) {
  try {
    const response = await api.get(`/documents/${id}/permissions`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // No permissions set yet
    }
    throw new Error(error.response?.data?.error || 'Failed to get document permissions');
  }
}

export async function updateDocumentPermissions(id, permissions) {
  try {
    const response = await api.put(`/documents/${id}/permissions`, permissions);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to update document permissions');
  }
}