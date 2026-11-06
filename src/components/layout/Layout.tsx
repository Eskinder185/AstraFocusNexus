import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { cn } from '../../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setShowMobileMenu(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  const closeMobileMenu = () => setShowMobileMenu(false);

  return (
    <div className="min-h-screen bg-bg0 text-fg selection:bg-brand/30">
      <Sidebar 
        isCollapsed={isCollapsed} 
        onToggle={toggleSidebar}
        showMobileMenu={showMobileMenu}
        onCloseMobileMenu={closeMobileMenu}
      />
      <div className={cn(
        "transition-all duration-300",
        showMobileMenu ? "pl-0" : isCollapsed ? "pl-0" : "pl-64",
        "md:pl-64 md:block"
      )}>
        <main className="p-4 md:p-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;


