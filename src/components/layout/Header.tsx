import React from 'react';
import { Search, Plus, Command } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../Button';

const Header = () => {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-line bg-bg1/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-10 pr-4 py-2 bg-bg0 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-bg0 border border-line rounded text-[10px]">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1 mr-4">
          <span className="text-sm text-muted-foreground">Quick Create:</span>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Plus size={16} className="mr-1" />
            New Task
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Plus size={16} className="mr-1" />
            New Note
          </Button>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/50 flex items-center justify-center text-brand font-bold">
          JD
        </div>
      </div>
    </header>
  );
};

export default Header;
