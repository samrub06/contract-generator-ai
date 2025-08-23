import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-16 relative">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white font-bold">AI</span>
            <Link to="/" className="font-semibold hover:text-indigo-600 transition-colors">
              Contract Generator
            </Link>
          </div>
          
          {/* Navigation */}
          <nav className="flex items-center space-x-6">
            <Link 
              to="/" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              🚀 Long Contracts
            </Link>
            <Link 
              to="/legacy" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/legacy' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              ⚡ Legacy Streaming
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header; 