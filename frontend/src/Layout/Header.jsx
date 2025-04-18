import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import debounce from 'lodash/debounce';
import { fetchDocuments } from '../services/document';

const Header = () => {
  const { currentUser, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [documents, setDocuments] = useState([]);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (currentUser) {
      const loadDocuments = async () => {
        try {
          const docs = await fetchDocuments();
          setDocuments(docs);
        } catch (error) {
          console.error('Failed to load documents:', error);
        }
      };
      
      loadDocuments();
    }
  }, [currentUser]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const debouncedSearch = useRef(
    debounce((query) => {
      if (query.trim() === '') {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      console.log("filtered docs:", filteredDocs)
      const filteredDocs = documents.filter(doc => 
        doc.title.toLowerCase().includes(query.toLowerCase()) || 
        (doc.content && doc.content.toLowerCase().includes(query.toLowerCase()))
      );
      
      setSearchResults(filteredDocs);
      setIsSearching(false);
    }, 300)
  ).current;
  
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(true);
    debouncedSearch(query);
  };
  
  const navigateToDocument = (docId) => {
    setShowResults(false);
    setSearchQuery('');
    navigate(`/documents/${docId}`);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const handleKeyDown = (e) => {
    // Navigate to first result when pressing Enter
    if (e.key === 'Enter' && searchResults.length > 0) {
      navigateToDocument(searchResults[0].id);
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Logo */}
        <div className="flex items-center">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
            DocSmith
          </span>
        </div>

        {/* Search bar */}
        {currentUser && (
          <div className="hidden w-full max-w-xl px-2 lg:flex" ref={searchRef}>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="w-full py-2 pl-10 pr-3 text-sm bg-gray-100 border border-transparent rounded-md focus:outline-none focus:bg-white focus:border-blue-500"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                onFocus={() => searchQuery && setShowResults(true)}
              />
              
              {/* Search Results Dropdown */}
              {showResults && (searchQuery || isSearching) && (
                <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden bg-white rounded-md shadow-lg">
                  {isSearching ? (
                    <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    <ul className="max-h-80 overflow-y-auto">
                      {searchResults.map((doc) => (
                        <li key={doc.id} className="border-b border-gray-100 last:border-0">
                          <button
                            onClick={() => navigateToDocument(doc.id)}
                            className="block w-full px-4 py-3 text-left hover:bg-gray-50"
                          >
                            <div className="font-medium text-gray-900 truncate">{doc.title}</div>
                            {doc.content && (
                              <div className="mt-1 text-xs text-gray-500 truncate">
                                {doc.content.substring(0, 100)}...
                              </div>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : searchQuery ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No documents found</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        {/* User menu */}
        {currentUser && (
          <div className="relative flex items-center ml-auto">
            <button
              type="button"
              className="flex items-center p-1 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 mr-2 text-white bg-blue-500 rounded-full">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <span className="mr-1 text-sm font-medium text-gray-700">{currentUser.username}</span>
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 z-10 w-48 py-1 mt-2 bg-white rounded-md shadow-lg top-full ring-1 ring-black ring-opacity-5">
                <a
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Your Profile
                </a>
                <a
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Settings
                </a>
                <button
                  onClick={handleLogout}
                  className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;