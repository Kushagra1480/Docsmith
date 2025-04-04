import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  // These would come from your actual auth context
  const { currentUser, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const handleLogout = () => {
    logout()
    useNavigate('/login');
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
        {
          currentUser && (
        <div className="hidden w-full max-w-xl px-2 lg:flex">
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
            />
          </div>
        </div>
          )
        }

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