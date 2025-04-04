
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { DocumentProvider } from './context/DocumentContext';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DocumentProvider>
          <App />
        </DocumentProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);