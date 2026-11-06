import React from 'react';
import { cn } from '../lib/utils';
import { DesignTokens, GridPattern } from '../design-system/tokens';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout = ({ children, className }: LayoutProps) => {
  return (
    <div className={cn(
      'min-h-screen bg-bg0 text-fg selection:bg-brand/30',
      className
    )}>
      {/* Grid pattern background on desktop */}
      <div 
        className="fixed inset-0 pointer-events-none hidden md:block"
        style={{
          backgroundImage: GridPattern.style,
          backgroundSize: '38px 38px',
          maskImage: 'linear-gradient(to right, transparent, black), linear-gradient(to bottom, transparent, black)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black), linear-gradient(to bottom, transparent, black)'
        }}
      />
      
      {/* Gradient overlay for depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(0, 229, 255, 0.15), transparent 70%)' }}
        />
        <div 
          className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(124, 77, 255, 0.1), transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 md:p-8 w-full max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export { Layout };
