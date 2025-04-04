import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './Auth/Login';
import Register from './Auth/Register';
import DocumentEditor from './Documents/DocumentEditor';
import ProtectedRoute from './Common/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Header from './Layout/Header';
import SharedDocument from './Documents/SharedDocument';

function App() {
  const { currentUser } = useAuth();

  return (
    <div className="app">
      <Header />
      <main className="content">
        <Routes>
          <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!currentUser ? <Register /> : <Navigate to="/" />} />
          <Route path="/shared/:shareId" element={<SharedDocument />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DocumentEditor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/documents/:id" 
            element={
              <ProtectedRoute>
                <DocumentEditor />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;