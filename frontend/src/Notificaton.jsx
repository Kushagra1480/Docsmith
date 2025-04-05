import React, { useEffect } from 'react';

const Notification = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  const baseStyles = "fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium text-sm flex items-center space-x-2 transition-all duration-300 transform translate-y-0";
  const typeStyles = {
    success: "bg-gradient-to-r from-blue-500 to-teal-400",
    error: "bg-gradient-to-r from-red-500 to-pink-400"
  };

  return (
    <div 
      className={`${baseStyles} ${typeStyles[type]}`}
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      <span>{message}</span>
      <button 
        onClick={onClose}
        className="ml-2 focus:outline-none hover:opacity-80"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// Add this CSS in your global styles or in a <style> tag
const notificationStyles = `
  @keyframes slideIn {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

export default Notification;