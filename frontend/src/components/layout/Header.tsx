import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {

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
          
          
     
        
      
        </div>
      </div>
    </header>
  );
};

export default Header; 