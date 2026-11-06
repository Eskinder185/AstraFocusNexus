import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  LayoutDashboard, 
  Target, 
  Zap, 
  Brain,
  Compass,
  Info,
  CircleHelp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { SidebarItem } from './SidebarItem';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  showMobileMenu?: boolean;
  onCloseMobileMenu?: () => void;
}

const Sidebar = ({ 
  isCollapsed: controlledIsCollapsed,
  onToggle, 
  showMobileMenu = false, 
  onCloseMobileMenu 
}: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved !== null ? saved === 'true' : false;
  });
  const isCollapsed = controlledIsCollapsed ?? internalIsCollapsed;

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsCollapsed(prev => !prev);
    }
  };

  const navigation = [
    { icon: <LayoutDashboard size={20} />, label: 'Home', path: '/' },
    { icon: <Zap size={20} />, label: 'Focus', path: '/focus' },
    { icon: <Brain size={20} />, label: 'Wellness', path: '/wellness' },
    { icon: <Compass size={20} />, label: 'Matrix', path: '/matrix' },
    { icon: <Target size={20} />, label: 'Goals', path: '/goals' },
    { icon: <Info size={20} />, label: 'About', path: '/about' },
    { icon: <CircleHelp size={20} />, label: 'FAQ', path: '/faq' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
          onClick={onCloseMobileMenu}
        />
      )}
      
      <div
        className={cn(
          "fixed left-0 top-0 h-full bg-bg1 border-r border-line p-4 flex flex-col transition-all duration-300 ease-in-out z-[70]",
          isCollapsed ? "w-16" : "w-64",
          "md:relative md:translate-x-0 bg-bg1 md:bg-transparent md:border-none md:p-0"
        )}
      >
        <div className="flex items-center justify-between mb-8 px-2">
          {!isCollapsed && (
            <span className="text-xl font-bold text-fg tracking-tight">
              AstraFocusNexus
            </span>
          )}
          <button
            onClick={handleToggle}
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-line"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
          {navigation.map(item => (
            <SidebarItem 
              key={item.path}
              icon={item.icon} 
              label={item.label} 
              active={location.pathname === item.path}
              isCollapsed={isCollapsed}
              onClick={() => {
                navigate(item.path);
                onCloseMobileMenu?.();
              }}
            />
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
