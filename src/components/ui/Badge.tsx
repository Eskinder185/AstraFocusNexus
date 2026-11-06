import React from 'react';
import { cn } from '../../lib/utils';
import { DesignTokens, Typography } from '../../design-system/tokens';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'primary' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className,
}) => {
  const variantStyles = {
    success: cn('bg-success.bg text-success.DEFAULT border border-success.border'),
    error: cn('bg-error.bg text-error.DEFAULT border border-error.border'),
    warning: cn('bg-warning.bg text-warning.DEFAULT border border-warning.border'),
    info: cn('bg-info.bg text-info.DEFAULT border border-info.border'),
    primary: cn('bg-brand/20 text-brand border border-brand/40'),
    neutral: cn('bg-white/5 text-fg border border-white/10'),
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full font-semibold',
      variantStyles[variant],
      sizeStyles[size],
      className
    )}>
      {children}
    </span>
  );
};

export default Badge;
