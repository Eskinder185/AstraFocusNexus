import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { DesignTokens, Typography } from '../../design-system/tokens';


interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [targetRef, setTargetRef] = useState<React.RefObject<HTMLElement>>(React.useRef(null));

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <div 
      className={cn('inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute bg-bg2 border border-white/10 p-2 rounded shadow-lg text-xs whitespace-nowrap z-[600]',
            Typography.fontSize.xs
          )}
          style={{
            left: coords.x,
            top: coords.y,
            transform: `translate(-50%, -100%)`,
            marginTop: '-4px',
          }}
        >
          {content}
          {/* Arrow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-bg2 border-b border-r border-white/10 rotate-45" />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
