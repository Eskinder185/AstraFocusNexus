import React from 'react';
import { cn } from '../../lib/utils';
import { DesignTokens, Typography } from '../../design-system/tokens';


interface ProgressProps {
  value: number;
  max?: number;
  color?: 'primary' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const colorStyles = {
    primary: 'bg-brand',
    success: 'bg-success.DEFAULT',
    error: 'bg-error.DEFAULT',
    warning: 'bg-warning.DEFAULT',
    info: 'bg-info.DEFAULT',
  };

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn(
      'w-full bg-white/5 rounded-full overflow-hidden',
      className
    )}>
      <div 
        className={cn(
          'h-full transition-all duration-300 ease-out',
          colorStyles[color],
          heightStyles[size]
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default Progress;
