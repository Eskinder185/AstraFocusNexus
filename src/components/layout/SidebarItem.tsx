import { cn } from '../../lib/utils';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isCollapsed: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const SidebarItem = ({ 
  icon, 
  label, 
  active, 
  isCollapsed, 
  onClick 
}: SidebarItemProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center p-2 rounded-md transition-colors",
        active ? "bg-brand/20 text-brand" : "hover:bg-white/5 text-fg",
        isCollapsed ? "justify-center" : "justify-start"
      )}
    >
      <span className={cn("flex items-center flex-1 gap-3", isCollapsed && "gap-0")}>
        {icon}
        {!isCollapsed && (
          <span className="font-medium">{label}</span>
        )}
      </span>
    </button>
  );
};

