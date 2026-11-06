import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { DesignTokens, Typography } from '../../design-system/tokens';



interface DropdownItem {
  label: string;
  value: string;
  onClick?: () => void;
}

interface DropdownProps {
  options: DropdownItem[];
  trigger: React.ReactNode;
  selected?: string;
  onSelect?: (value: string) => void;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  trigger,
  selected,
  onSelect,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setCoords({ x: rect.left, y: rect.bottom + 5 });
    setIsOpen(!isOpen);
  };

  const handleSelect = (value: string) => {
    onSelect?.(value);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative inline-block', className)} ref={containerRef}>
      <div onClick={handleTriggerClick} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div
          className={cn(
            'absolute bg-bg2 border border-white/10 rounded-md shadow-xl py-1 min-w-[150px] z-[600]',
            Typography.fontSize.sm
          )}
          style={{ left: coords.x, top: coords.y }}
        >
          {options.map((opt, i) => (
            <div
              key={i}
              className={cn(
                'px-4 py-2 hover:bg-white/5 transition-colors',
                selected === opt.value && 'text-brand'
              )}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
