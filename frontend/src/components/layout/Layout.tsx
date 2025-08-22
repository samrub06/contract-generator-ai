import React from 'react';
import Header from './Header';

interface LayoutProps {
 
  children: React.ReactNode;
}

// Layout component that includes the Header and wraps the main content
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50`}>
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout; 